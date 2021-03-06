import sys
#sys.path.append("E:/annotation_app/backends/SiamMask")
#sys.path.append("E:/annotation_app/backends/SiamMask/experiments/siammask_sharp")
sys.path.append("backends/SiamMask")
sys.path.append("backends/SiamMask/experiments/siammask_sharp")

import torch
from torch.autograd import Variable
import torch.nn.functional as F
from pathlib import Path
import numpy as np
import cv2

from argparse import Namespace
from image_array import MovieImageArray

from tools.test import load_config, load_pretrain, siamese_init, get_subwindow_tracking
from custom import Custom


def siamese_track_v2(state, im, mask_enable=True, refine_enable=True, polygon_enable=True, device='cpu', debug=False, epsilon_ratio=0.01):
    p = state['p']
    net = state['net']
    avg_chans = state['avg_chans']
    window = state['window']
    target_pos = state['target_pos']
    target_sz = state['target_sz']

    wc_x = target_sz[1] + p.context_amount * sum(target_sz)
    hc_x = target_sz[0] + p.context_amount * sum(target_sz)
    s_x = np.sqrt(wc_x * hc_x)
    scale_x = p.exemplar_size / s_x
    d_search = (p.instance_size - p.exemplar_size) / 2
    pad = d_search / scale_x
    s_x = s_x + 2 * pad
    crop_box = [target_pos[0] - round(s_x) / 2, target_pos[1] - round(s_x) / 2, round(s_x), round(s_x)]

    if debug:
        im_debug = im.copy()
        crop_box_int = np.int0(crop_box)
        cv2.rectangle(im_debug, (crop_box_int[0], crop_box_int[1]),
                      (crop_box_int[0] + crop_box_int[2], crop_box_int[1] + crop_box_int[3]), (255, 0, 0), 2)
        cv2.imshow('search area', im_debug)
        cv2.waitKey(0)

    # extract scaled crops for search region x at previous target position
    x_crop = Variable(get_subwindow_tracking(im, target_pos, p.instance_size, round(s_x), avg_chans).unsqueeze(0))

    if mask_enable:
        score, delta, mask = net.track_mask(x_crop.to(device))
    else:
        score, delta = net.track(x_crop.to(device))

    delta = delta.permute(1, 2, 3, 0).contiguous().view(4, -1).data.cpu().numpy()
    score = F.softmax(score.permute(1, 2, 3, 0).contiguous().view(2, -1).permute(1, 0), dim=1).data[:,
            1].cpu().numpy()

    delta[0, :] = delta[0, :] * p.anchor[:, 2] + p.anchor[:, 0]
    delta[1, :] = delta[1, :] * p.anchor[:, 3] + p.anchor[:, 1]
    delta[2, :] = np.exp(delta[2, :]) * p.anchor[:, 2]
    delta[3, :] = np.exp(delta[3, :]) * p.anchor[:, 3]

    def change(r):
        return np.maximum(r, 1. / r)

    def sz(w, h):
        pad = (w + h) * 0.5
        sz2 = (w + pad) * (h + pad)
        return np.sqrt(sz2)

    def sz_wh(wh):
        pad = (wh[0] + wh[1]) * 0.5
        sz2 = (wh[0] + pad) * (wh[1] + pad)
        return np.sqrt(sz2)

    # size penalty
    target_sz_in_crop = target_sz*scale_x
    s_c = change(sz(delta[2, :], delta[3, :]) / (sz_wh(target_sz_in_crop)))  # scale penalty
    r_c = change((target_sz_in_crop[0] / target_sz_in_crop[1]) / (delta[2, :] / delta[3, :]))  # ratio penalty

    penalty = np.exp(-(r_c * s_c - 1) * p.penalty_k)
    pscore = penalty * score

    # cos window (motion model)
    pscore = pscore * (1 - p.window_influence) + window * p.window_influence
    best_pscore_id = np.argmax(pscore)

    pred_in_crop = delta[:, best_pscore_id] / scale_x
    lr = penalty[best_pscore_id] * score[best_pscore_id] * p.lr  # lr for OTB

    res_x = pred_in_crop[0] + target_pos[0]
    res_y = pred_in_crop[1] + target_pos[1]

    res_w = target_sz[0] * (1 - lr) + pred_in_crop[2] * lr
    res_h = target_sz[1] * (1 - lr) + pred_in_crop[3] * lr

    target_pos = np.array([res_x, res_y])
    target_sz = np.array([res_w, res_h])

    # for Mask Branch
    if mask_enable:
        best_pscore_id_mask = np.unravel_index(best_pscore_id, (5, p.score_size, p.score_size))
        delta_x, delta_y = best_pscore_id_mask[2], best_pscore_id_mask[1]

        if refine_enable:
            mask = net.track_refine((delta_y, delta_x)).to(device).sigmoid().squeeze().view(
                p.out_size, p.out_size).cpu().data.numpy()
        else:
            mask = mask[0, :, delta_y, delta_x].sigmoid(). \
                squeeze().view(p.out_size, p.out_size).cpu().data.numpy()

        def crop_back(image, bbox, out_sz, padding=-1):
            a = (out_sz[0] - 1) / bbox[2]
            b = (out_sz[1] - 1) / bbox[3]
            c = -a * bbox[0]
            d = -b * bbox[1]
            mapping = np.array([[a, 0, c],
                                [0, b, d]]).astype(np.float)
            crop = cv2.warpAffine(image, mapping, (out_sz[0], out_sz[1]),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=padding)
            return crop

        s = crop_box[2] / p.instance_size
        sub_box = [crop_box[0] + (delta_x - p.base_size / 2) * p.total_stride * s,
                   crop_box[1] + (delta_y - p.base_size / 2) * p.total_stride * s,
                   s * p.exemplar_size, s * p.exemplar_size]
        s = p.out_size / sub_box[2]
        back_box = [-sub_box[0] * s, -sub_box[1] * s, state['im_w'] * s, state['im_h'] * s]
        mask_in_img = crop_back(mask, back_box, (state['im_w'], state['im_h']))

        target_mask = (mask_in_img > p.seg_thr).astype(np.uint8)
        if cv2.__version__[-5] == '4':
            contours, _ = cv2.findContours(target_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        else:
            _, contours, _ = cv2.findContours(target_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cnt_area = [cv2.contourArea(cnt) for cnt in contours]
        if len(contours) != 0 and np.max(cnt_area) > 100:
            contour = contours[np.argmax(cnt_area)]  # use max area polygon
            polygon = contour.reshape(-1, 2)
            pbox = cv2.boundingRect(polygon)  # Min Max Rectangle
            #prbox = cv2.boxPoints(cv2.minAreaRect(polygon))  # Rotated Rectangle

            box_in_img = pbox
            #rbox_in_img = prbox

            if polygon_enable:
                epsilon = epsilon_ratio*cv2.arcLength(polygon, True)
                approx = cv2.approxPolyDP(polygon, epsilon, True)
            else:
                approx = None

            can_get_mask = True
        else:  # empty mask
            box_in_img = None
            approx = None
            can_get_mask = False
    else:
        mask_in_img = None
        box_in_img = None
        approx = None
        can_get_mask = False

    target_pos[0] = max(0, min(state['im_w'], target_pos[0]))
    target_pos[1] = max(0, min(state['im_h'], target_pos[1]))
    target_sz[0] = max(10, min(state['im_w'], target_sz[0]))
    target_sz[1] = max(10, min(state['im_h'], target_sz[1]))

    state['target_pos'] = target_pos
    state['target_sz'] = target_sz
    state['score'] = score[best_pscore_id]
    state['mask'] = mask_in_img
    state['bbox'] = box_in_img
    state["polygon"] = approx
    return state


class SiamMaskTracker:
    def __init__(self, is_cpu=True, epsilon=0.01):
        is_cpu = not torch.cuda.is_available() and is_cpu
        configarg = Namespace(resume="backends/SiamMask/experiments/siammask_sharp/SiamMask_DAVIS.pth",
                              config="backends/SiamMask/experiments/siammask_sharp/config_davis.json",
                              base_path="",
                              cpu=is_cpu,
                             )
        device = torch.device("cuda" if not is_cpu else "cpu")
        self.cfg = load_config(configarg)
        siammask = Custom(anchors=self.cfg['anchors'])
        
        self.siammask = load_pretrain(siammask, configarg.resume)
        self.siammask.eval().to(device)
        self.device = device
        self.epsilon=epsilon
        
    def set_bbox(self, image, xyxy_dict=None, polygon_list=None):
        if xyxy_dict is None:
            raise Exception("SiameseMaskTracker set_bbox need xyxy_dict")
        x1 = xyxy_dict["x1"]
        y1 = xyxy_dict["y1"]
        x2 = xyxy_dict["x2"]
        y2 = xyxy_dict["y2"]
        
        w = x2 - x1
        h = y2 - y1
        
        target_pos = np.array([x1 + w/2, y1+h/2])
        target_sz = np.array([w, h])
        self.state = siamese_init(image, 
                                  target_pos,
                                  target_sz,
                                  self.siammask,
                                  self.cfg['hp'],
                                  device=self.device)
        
    def get_bbox(self, image):
        self.state = siamese_track_v2(self.state,
                                      image,
                                      mask_enable=True,
                                      refine_enable=True,
                                      polygon_enable=True,
                                      device=self.device,
                                      epsilon_ratio=self.epsilon
                                     )
        
        out_dict = {}
        xywh = self.state["bbox"]
        xyxy_dict = {"x1":int(xywh[0]), "y1":int(xywh[1]), "x2":int(xywh[0]+xywh[2]), "y2":int(xywh[1]+xywh[3])}
        out_dict["bbox_dict"] = xyxy_dict
        

        if "polygon" in self.state:
            polygon_array = self.state["polygon"].squeeze()
            polygon_list = []
            for one_point_list in polygon_array:
                polygon_list.append({"x":int(one_point_list[0]),"y":int(one_point_list[1])})
            out_dict["polygon"] = polygon_list
        else:
            out_dict["polygon"] = None
        
        return out_dict


if __name__ == "__main__":
  pass