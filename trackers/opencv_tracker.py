import cv2


class KCFTracker:
    def __init__(self):
        self.tracker = cv2.TrackerKCF_create()
        
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
        success, xywh_bbox = self.tracker.update(image)
        
        if success:
            xyxy_dict = {"x1":int(xywh_bbox[0]),
                         "y1":int(xywh_bbox[1]),
                         "x2":int(xywh_bbox[0]+xywh_bbox[2]),
                         "y2":int(xywh_bbox[1]+xywh_bbox[3])
                        }
        else:
            xyxy_dict = None    
        
        out_dict = {"bbox_dict":xyxy_dict, "polygon":None}
        return out_dict


class CSRTTracker:
    def __init__(self):
        self.tracker = cv2.TrackerCSRT_create()
        
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
        success, xywh_bbox = self.tracker.update(image)
        
        if success:
            xyxy_dict = {"x1":int(xywh_bbox[0]),
                         "y1":int(xywh_bbox[1]),
                         "x2":int(xywh_bbox[0]+xywh_bbox[2]),
                         "y2":int(xywh_bbox[1]+xywh_bbox[3])
                        }
        else:
            xyxy_dict = None    
        
        out_dict = {"bbox_dict":xyxy_dict, "polygon":None}
        return out_dict


class GoTurnTracker:
    def __init__(self):
        self.tracker = cv2.TrackerGOTURN_create()
        
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
        success, xywh_bbox = self.tracker.update(image)
        
        if success:
            xyxy_dict = {"x1":int(xywh_bbox[0]),
                         "y1":int(xywh_bbox[1]),
                         "x2":int(xywh_bbox[0]+xywh_bbox[2]),
                         "y2":int(xywh_bbox[1]+xywh_bbox[3])
                        }
        else:
            xyxy_dict = None    
        
        out_dict = {"bbox_dict":xyxy_dict, "polygon":None}
        return out_dict 



if __name__ == "__main__":
    pass

  