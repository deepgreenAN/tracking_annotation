import sys
sys.path.append("backends/pysot")

from argparse import Namespace
import torch
from pathlib import Path
import numpy as np
import cv2
import sys

import pysot.models.model_builder
import pysot.tracker.tracker_builder
from pysot.core.config import cfg
#from pysot.models.model_builder import ModelBuilder
#from pysot.tracker.tracker_builder import build_tracker


class SiamRPNTracker:
    def __init__(self, is_cpu=True):
        is_cpu = not torch.cuda.is_available() and is_cpu
        cfgarg = Namespace(config="backends/pysot/experiments/siamrpn_alex_dwxcorr/config.yaml",
                           snapshot="backends/pysot/experiments/siamrpn_alex_dwxcorr/model.pth",
                          )
        # try:  # 初期化が出来ない謎仕様のため
        #     del sys.modules['pysot.core.config']
        #     del sys.modules['pysot.models.model_builder']
        #     del sys.modules['pysot.tracker.tracker_builder']
        # except Exception as e:
        #     print("cannot re import")
        # from pysot.core.config import cfg
        # import pysot.models.model_builder
        # import pysot.tracker.tracker_builder

        cfg.merge_from_file(cfgarg.config)
        cfg.CUDA = not is_cpu
        #cfg.CUDA = False
        device = torch.device("cuda" if not is_cpu else "cpu")
        model = pysot.models.model_builder.ModelBuilder()
        model.load_state_dict(torch.load(cfgarg.snapshot,
                              map_location=lambda storage, loc: storage.cpu()))
        model.eval().to(device)
        self.tracker = pysot.tracker.tracker_builder.build_tracker(model)
        
    def set_bbox(self, image, xyxy_dict=None, polygon_list=None):
        if xyxy_dict is None:
            raise Exception("SiameseMaskTracker set_bbox need xyxy_dict")
        x1 = xyxy_dict["x1"]
        y1 = xyxy_dict["y1"]
        x2 = xyxy_dict["x2"]
        y2 = xyxy_dict["y2"]
        w = x2-x1
        h = y2-y1
        
        self.tracker.init(image, (x1,y1,w,h))
        
    def get_bbox(self, image):
        outputs = self.tracker.track(image)
        
        xyxy_dict = {"x1":int(outputs["bbox"][0]),
                     "y1":int(outputs["bbox"][1]),
                     "x2":int(outputs["bbox"][0]+outputs["bbox"][2]),
                     "y2":int(outputs["bbox"][1]+outputs["bbox"][3])
                    }
        
        out_dict = {"bbox_dict":xyxy_dict, "polygon":None}
        return out_dict


class SiamRPNTrackerV2:
    def __init__(self, is_cpu=True):
        is_cpu = not torch.cuda.is_available() and is_cpu
        cfgarg = Namespace(config="backends/pysot/experiments/siamrpn_mobilev2_l234_dwxcorr/config.yaml",
                           snapshot="backends/pysot/experiments/siamrpn_mobilev2_l234_dwxcorr/model.pth",
                          )

        # try:  # 初期化が出来ない謎仕様のため
        #     del sys.modules['pysot.core.config']
        #     del sys.modules['pysot.models.model_builder']
        #     del sys.modules['pysot.tracker.tracker_builder']
        # except Exception as e:
        #     print("cannot re import")
        # from pysot.core.config import cfg
        # import pysot.models.model_builder
        # import pysot.tracker.tracker_builder

        # cfg.merge_from_file(cfgarg.config)
        cfg.CUDA = not is_cpu
        #cfg.CUDA = False
        device = torch.device("cuda" if not is_cpu else "cpu")
        model = pysot.models.model_builder.ModelBuilder()
        model.load_state_dict(torch.load(cfgarg.snapshot,
                              map_location=lambda storage, loc: storage.cpu()))
        model.eval().to(device)
        self.tracker = pysot.tracker.tracker_builder.build_tracker(model)
        
    def set_bbox(self, image, xyxy_dict=None, polygon_list=None):
        if xyxy_dict is None:
            raise Exception("SiameseMaskTracker set_bbox need xyxy_dict")
        x1 = xyxy_dict["x1"]
        y1 = xyxy_dict["y1"]
        x2 = xyxy_dict["x2"]
        y2 = xyxy_dict["y2"]
        w = x2-x1
        h = y2-y1
        
        self.tracker.init(image, (x1,y1,w,h))
        
    def get_bbox(self, image):
        outputs = self.tracker.track(image)
        
        xyxy_dict = {"x1":int(outputs["bbox"][0]),
                     "y1":int(outputs["bbox"][1]),
                     "x2":int(outputs["bbox"][0]+outputs["bbox"][2]),
                     "y2":int(outputs["bbox"][1]+outputs["bbox"][3])
                    }
        
        out_dict = {"bbox_dict":xyxy_dict, "polygon":None}
        return out_dict


class SiamMaskTrackerV2():
    def __init__(self, is_cpu=True, epsilon=0.01):
        is_cpu = not torch.cuda.is_available() and is_cpu
        cfgarg = Namespace(config="backends/pysot/experiments/siammask_r50_l3/config.yaml",
                           snapshot="backends/pysot/experiments/siammask_r50_l3/model.pth",
                          )

        # try:  # 初期化が出来ない謎仕様のため
        #     del sys.modules['pysot.core.config']
        #     del sys.modules['pysot.models.model_builder']
        #     del sys.modules['pysot.tracker.tracker_builder']
        # except Exception as e:
        #     print("cannot re import")
        # from pysot.core.config import cfg
        # import pysot.models.model_builder
        # import pysot.tracker.tracker_builder

        cfg.merge_from_file(cfgarg.config)
        cfg.CUDA = not is_cpu
        #cfg.CUDA = False
        device = torch.device("cuda" if not is_cpu else "cpu")
        model = pysot.models.model_builder.ModelBuilder()
        model.load_state_dict(torch.load(cfgarg.snapshot,
                              map_location=lambda storage, loc: storage.cpu()))
        model.eval().to(device)
        self.tracker = pysot.tracker.tracker_builder.build_tracker(model)
        self.epsilon = epsilon
        
    def set_bbox(self, image, xyxy_dict=None, polygon_list=None):
        if xyxy_dict is None:
            raise Exception("SiameseMaskTracker set_bbox need xyxy_dict")
        x1 = xyxy_dict["x1"]
        y1 = xyxy_dict["y1"]
        x2 = xyxy_dict["x2"]
        y2 = xyxy_dict["y2"]
        w = x2-x1
        h = y2-y1
        
        self.tracker.init(image, (x1,y1,w,h))
        
    def get_bbox(self, image):
        outputs = self.tracker.track(image)
        mask_img = (outputs["mask"]*255).astype(np.uint8)
        _, img_otsu = cv2.threshold(mask_img, 0, 255, cv2.THRESH_OTSU)
        #_, contours, _ = cv2.findContours(img_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if cv2.__version__[-5] == '4':
            contours, _ = cv2.findContours(img_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        else:
            _, contours, _ = cv2.findContours(img_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        out_dict = {}
        
        cnt_area = [cv2.contourArea(cnt) for cnt in contours]
        if len(contours) != 0 and np.max(cnt_area) > 100:
            contour = contours[np.argmax(cnt_area)]  # use max area polygon
            polygon = contour.reshape(-1, 2)
            pbox = cv2.boundingRect(polygon)  # Min Max Rectangle

            out_dict["bbox_dict"] = {"x1":pbox[0],
                                     "y1":pbox[1],
                                     "x2":pbox[0]+pbox[2],
                                     "y2":pbox[1]+pbox[3]
                                    }           
            epsilon = self.epsilon*cv2.arcLength(polygon, True)
            approx = cv2.approxPolyDP(polygon, epsilon, True).squeeze()
            out_dict["polygon"] = [{"x":int(one_point[0]), "y":int(one_point[1])} for one_point in approx]
            
        else:
            out_dict["polygon"] = None
            out_dict["bbox_dict"] = {"x1":None,"y1":None,"x2":None,"y2":None}
        
        return out_dict

    
if __name__ == "__main__":
  pass
