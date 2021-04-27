from flask import Flask, render_template, make_response, request, redirect, url_for, send_from_directory
from flask import Response, jsonify
from pathlib import Path
import shutil
import json
import cv2
import numpy as np
from image_array import MovieImageArrayFile
from app_config import config
from tracker_factory import tracker_symbols, factory


app = Flask(__name__)

class AppGlobal:
    def __init__(self):
        self.image_array = []
        self.tracker = config.tracker
        self.output_images_dir_path = None
        self.output_json_path = None
        self.static_images_path = None
        self.movie_name = None
        self.movie_height = None
        self.movie_width = None
        self.image_name_list = []
        self.path_read_success = False

app_global = AppGlobal()

@app.route('/')
def index():
    app.logger.debug("this is root")
    return render_template('index.html')

def load_json(json_path):
    with open(json_path, "r") as f:
        json_dict = json.load(f)

    all_data_dict = {}
    for one_frame_dict in json_dict:
        frame_number_str = Path(one_frame_dict["file_name"]).stem.split("_")[-1]
        frame_key = "frame_" + frame_number_str
        all_data_dict[frame_key] = {}
        for one_object_dict in one_frame_dict["annotations"]:
            object_id = one_object_dict["tracking_object_id"]
            object_key = "object_" + str(object_id)
            
            all_data_dict[frame_key][object_key] = {}
            if "bbox" in one_object_dict.keys():
                pos_dict = {"x1":one_object_dict["bbox"][0],
                            "y1":one_object_dict["bbox"][1],
                            "x2":one_object_dict["bbox"][2],
                            "y2":one_object_dict["bbox"][3]
                        }
            else:
                pos_dict = None
            if "polygon" in one_object_dict.keys():
                polygon_list = [{"x":one_point[0], "y":one_point[1]} for one_point in one_object_dict["polygon"]]
            else:
                polygon_list = None
                
            all_data_dict[frame_key][object_key]["pos"] = pos_dict
            all_data_dict[frame_key][object_key]["polygon"] = polygon_list
            all_data_dict[frame_key][object_key]["state"] = one_object_dict["state_id"]
            all_data_dict[frame_key][object_key]["label"] = one_object_dict["category_id"]
            all_data_dict[frame_key][object_key]["object_id"] = object_id 
    
    return all_data_dict       


@app.route('/pathsubmit', methods=['POST'])
def upload_movie():
    app.logger.debug(request.json["input_movie_path"])
    app.logger.debug(request.json["input_json_path"])
    app.logger.debug(request.json["output_images_path"])
    app.logger.debug(request.json["output_json_path"])

    is_success = True
    movie_width = None
    movie_height = None

    input_movie_path = Path(request.json["input_movie_path"])
    app_global.movie_name = input_movie_path.stem
    if request.json["input_json_path"] == "":
        input_json_path = None
    else:
        input_json_path = Path(request.json["input_json_path"])
    output_images_dir_parent_path = Path(request.json["output_images_path"])
    app_global.output_images_dir_path = output_images_dir_parent_path / Path("images_"+app_global.movie_name)
    app_global.output_json_path = Path(request.json["output_json_path"])

    out_dict = {}

    if input_movie_path.suffix in [".mp4"] and input_movie_path.exists():
        cap = cv2.VideoCapture(str(input_movie_path))
        app_global.movie_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        app_global.movie_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        movie_width = app_global.movie_width
        movie_height = app_global.movie_height

        app_global.image_array = MovieImageArrayFile(input_movie_path, is_temp=True, temp_dir=Path("static"))
        app_global.image_array.read_movie(is_update=False)
    else:
        app.logger.debug("1"+str(input_movie_path.suffix in [".mp4"] ))
        app.logger.debug("2"+str(input_movie_path.exists()))
        is_success = False

    out_dict["image_w"] = movie_width
    out_dict["image_h"] = movie_height


    all_data_dict = None
    if input_json_path is not None: 
        if input_json_path.exists() and input_json_path.suffix==".json":
            all_data_dict = load_json(input_json_path)
        else:
            app.logger.debug("6"+str(input_json_path.exists()))
            app.logger.debug("7"+input_json_path.suffix)
            is_success = False
    
    out_dict["all_data_dict"] = all_data_dict
    
    if not output_images_dir_parent_path.exists() or not app_global.output_json_path.parent.exists() or app_global.output_json_path.suffix != ".json":
        app.logger.debug("3"+str(not output_images_dir_parent_path.exists()))
        app.logger.debug("4"+str(not app_global.output_json_path.parent.exists()))
        app.logger.debug("5"+str(app_global.output_json_path.suffix != ".json"))
        is_success = False
    

    image_path_list = []
    image_name_list = []
    app_global.static_images_path = Path("static") / Path("images_"+app_global.movie_name)
    for image_path in app_global.static_images_path.iterdir():
        image_path_list.append(str(image_path))
        image_name_list.append(str(image_path.name))
    
    out_dict["image_path_list"] = image_path_list
    out_dict["is_success"] = is_success

    app_global.image_name_list = image_name_list
    if is_success:
        app_global.path_read_success = True

    return jsonify(out_dict)


@app.route("/postbbox", methods=["POST"])
def send_bbox():
    #app.logger.debug("request:"+str(request.json))
    bbox_dict = request.json["bbox_dict"]
    #app.logger.debug("bbox_dict:"+str(bbox_dict))
    is_continue = request.json["is_continue"]
    #app.logger.debug("is_continue:"+str(is_continue))
    frame_number = int(request.json["frame"])
    #app.logger.debug("frame_number:"+str(frame_number))
    polygon_pos_list = request.json["polygon_list"]
    #app.logger.debug("polygon_list:"+str(polygon_pos_list)) 

    if app_global.path_read_success:  # ファイルの読み込みに成功している場合
        if not is_continue:
            app_global.tracker.set_bbox(app_global.image_array[frame_number], bbox_dict, polygon_pos_list)
            out_dict = app_global.tracker.get_bbox(app_global.image_array[frame_number+1])
        else:
            out_dict = app_global.tracker.get_bbox(app_global.image_array[frame_number+1])
    else:
        next_bbox_dict = {"x1":0,"y1":0,"x2":0,"y2":0}
        next_polygon_dict_list = []
        return jsonify({"bbox_dict":next_bbox_dict, "polygon_list":next_polygon_dict_list})

    next_bbox_dict = out_dict["bbox_dict"]
    next_polygon_dict_list = out_dict["polygon"]

    next_json = jsonify({"bbox_dict":next_bbox_dict, "polygon_list":next_polygon_dict_list})
    return next_json
    

@app.route("/savealldata", methods=["POST"])
def save_all_dict():
    if not app_global.path_read_success:
        return jsonify({"is_success":False})

    if not app_global.output_images_dir_path.exists():
        shutil.copytree(app_global.static_images_path, app_global.output_images_dir_path)
    
    all_data_json = request.json
    # jsonの成形
    out_json_dict = []
    for frame_key in all_data_json:
        one_frame_dict = {}
        frame_number = int(frame_key.split("_")[1])
        image_id = app_global.movie_name + "_" + str(frame_number)
        image_path = app_global.output_images_dir_path / app_global.image_name_list[frame_number]

        one_frame_dict["file_name"] = str(image_path)
        one_frame_dict["height"] = app_global.movie_height
        one_frame_dict["width"] = app_global.movie_width
        one_frame_dict["image_id"] = image_id
        annotations_list = []
        for object_key in all_data_json[frame_key]:
            one_object_dict = {}
            if all_data_json[frame_key][object_key]["pos"] is not None:
                one_object_dict["bbox"] = [
                    all_data_json[frame_key][object_key]["pos"]["x1"],
                    all_data_json[frame_key][object_key]["pos"]["y1"],
                    all_data_json[frame_key][object_key]["pos"]["x2"],
                    all_data_json[frame_key][object_key]["pos"]["y2"],
                ]
            if all_data_json[frame_key][object_key]["polygon"] is not None:
                one_object_dict["polygon"] = [[one_point["x"], one_point["y"]] for one_point in all_data_json[frame_key][object_key]["polygon"]]
            one_object_dict["bbox_mode"] = 0  # xyxy_abs
            one_object_dict["category_id"] = all_data_json[frame_key][object_key]["label"]
            one_object_dict["state_id"] = all_data_json[frame_key][object_key]["state"]
            one_object_dict["tracking_object_id"] = all_data_json[frame_key][object_key]["object_id"]
            annotations_list.append(one_object_dict)
        
        one_frame_dict["annotations"] = annotations_list
        
        out_json_dict.append(one_frame_dict)

    with open(app_global.output_json_path, "w") as f:
        json.dump(out_json_dict, f, indent=4)

    if config.make_video:
        make_video_withbbox(request.json)
    
    return jsonify({"is_success":True})

@app.route("/removecash", methods=["POST"])
def remove_cash():
    app_global.image_array.close()
    app_global.path_read_success = False
    #return jsonify({})
    return Response()

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(Path(app.root_path) /Path('static'), 'favicon.png')

def make_video_withbbox(all_data):
    video_withbbox_path = Path("temp/video_with_bbox.mp4")

    fourcc = cv2.VideoWriter_fourcc('m', 'p', '4', 'v')
    out = cv2.VideoWriter(str(video_withbbox_path), fourcc, 30, (app_global.movie_width, app_global.movie_height))
    for i,image in enumerate(app_global.image_array):
        frame_key = "frame_" + str(i)
        if frame_key in all_data.keys():
            for object_key in all_data[frame_key]:
                if all_data[frame_key][object_key]["pos"] is not None:
                    x1,y1 = all_data[frame_key][object_key]["pos"]["x1"], all_data[frame_key][object_key]["pos"]["y1"]
                    x2,y2 = all_data[frame_key][object_key]["pos"]["x2"], all_data[frame_key][object_key]["pos"]["y2"]
                    image = cv2.rectangle(image, (x1,y1), (x2,y2), color=(0,0,0))
                    image = cv2.putText(
                        image, 
                        text=object_key,
                        org=(x1,y1),
                        fontFace=cv2.FONT_HERSHEY_SIMPLEX, 
                        color=(0,0,0), 
                        fontScale=1.0,
                        thickness=2,
                        lineType=cv2.LINE_4
                        )

                if all_data[frame_key][object_key]["polygon"] is not None:
                    #copied_image = image.copy()
                    polygon_array = [[one_point["x"], one_point["y"]] for one_point in all_data[frame_key][object_key]["polygon"]]
                    polygon_image = cv2.fillConvexPoly(image, points=np.array(polygon_array), color=(0,0,0))
                    #image = (1-0.3)*image + (1-0.7)*polygon_image

        out.write(image)
    
    out.release()

@app.route('/help')
def help():
    app.logger.debug("this is help")
    return render_template('help.html')


@app.route("/option")
def option():
    app.logger.debug("this is option")
    return render_template("option.html", trackers=tracker_symbols, make_video=config.make_video)


@app.route("/optionsubmit", methods=["POST"])
def get_option():
    config.make_video = request.json["make_video"]
    app.logger.debug("tracker name:"+str(request.json["tracker_name"]))
    config.tracker = factory(str(request.json["tracker_name"]), config.is_cpu)
    app_global.tracker = config.tracker
    return jsonify({"is_success":True})
    

if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=5000)