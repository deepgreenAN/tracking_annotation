//var all_data_dict = {"frame_0":{"object_0":{"pos":{"x1":null,"y1":null,"x2":null, "y2":null}, "label":null, "state":null, "object_id":null}}};
var all_data_dict = {}
let pre_pos_dict = {"x1":null, "y1":null, "x2":null, "y2":null};  // roiが変更されたかどうかで使う
let pre_polygon_pos_list = []  // roiが変更されたかどうかで使う

let frame_index = 0;

var roi_object_id = 0;
var roi_object_id_index_counter = 0;
var is_wait_action = false;
var is_wait_image_change = true;
var is_continue = false;

var true_width = null;
var true_height = null;
var pixel_ratio_display_over_true_x = 1;
var pixel_ratio_display_over_true_y = 1;

var is_auto_mode = false;

var pic_source_list = []


// pathについて
let input_movie_path_text = document.getElementById("input-movie-path-text")
let input_movie_path_input = document.getElementById("input-movie-path-input")

input_movie_path_text.readOnly = true

input_movie_path_input.addEventListener(
  "click",
  (e) => {
    var path_text = prompt("入力する動画のパスを入力してください");
    input_movie_path_text.value = path_text;
});

let input_json_path_text = document.getElementById("input-json-path-text")
let input_json_path_input = document.getElementById("input-json-path-input")

input_json_path_text.readOnly = true

input_json_path_input.addEventListener(
  "click",
  (e) => {
    var path_text = prompt("入力するjsonのパスを入力してください");
    input_json_path_text.value = path_text;
});

let output_images_path_text = document.getElementById("output-images-path-text")
let output_images_path_input = document.getElementById("output-images-path-input")

output_images_path_text.readOnly = true

output_images_path_input.addEventListener(
  "click",
  (e) => {
    var path_text = prompt("画像を保存するフォルダのパスを入力してください");
    output_images_path_text.value = path_text;
});

let output_json_path_text = document.getElementById("output-json-path-text")
let output_json_path_input = document.getElementById("output-json-path-input")

output_json_path_text.readOnly = true

output_json_path_input.addEventListener(
  "click",
  (e) => {
    var path_text = prompt("出力するjsonのパスを入力してください");
    output_json_path_text.value = path_text;
});

let path_submit_button = document.getElementById("path-submit")

function postPaths(){
  // 実際には送受信する
  console.log("input_movie_path_text:", input_movie_path_text.value)
  console.log("input_json_path_text:", input_json_path_text.value)
  console.log("output_images_path_text:", output_images_path_text.value)
  console.log("output_json_path_text:", output_json_path_text.value)
  if (input_movie_path_text.value != "" && output_images_path_text.value != "" && output_json_path_text.value != "") {
    is_wait_image_change = true;  // 画面の遷移を待ってもらう
    $.ajax({
      url: "pathsubmit",
      type: "POST",
      data: JSON.stringify({
        "input_movie_path": input_movie_path_text.value,
        "input_json_path": input_json_path_text.value,
        "output_images_path": output_images_path_text.value,
        "output_json_path": output_json_path_text.value
      }),
      dataType: "json",
      contentType: "application/json"
    })
    .done(function(response) {
      pic_source_list = response["image_path_list"]
      if (!response["is_success"]) {
        alert("入力されたパスが間違っています．入力し直してください")
      } else {
        alert("パスを読み込みました，")
        frame_index = 0
        shown_img.src = pic_source_list[frame_index]
        console.log("shown_img: width, height:", shown_img.width, shown_img.height)
        is_wait_image_change = false;
        true_width = response["image_w"]
        true_height = response["image_h"]
        if (response["all_data_dict"]!=null) {
          all_data_dict = response["all_data_dict"]
        }
        console.log("all_data_dict:",all_data_dict)

        setSizeCanvasWrapper();
        setSizeCanvas();
        setSizeRatio();

        //ラグがあるので遅れてもう一度
        setTimeout(() => {
          shown_img.src = pic_source_list[frame_index]
          setSizeCanvasWrapper();
          setSizeCanvas();
          setSizeRatio();
        },1000);
      }
    })
    console.log("posted all path")
  } else {
    alert("入力ファイルパス(jsonは任意)，出力ファイルパスを全て入力してください")
  }
}

path_submit_button.addEventListener("click", postPaths)

// CanvasBox
class CanvasBox{
  constructor(canvas, ctx){
    this.canvas = canvas;
    this.ctx = ctx;
    this.upper_left_pos = {"x":0, "y":0};
    this.lowwer_right_pos = {"x":0, "y":0};
    this.is_search_upper_left = true;
    this.pixel_ratio_display_over_true_x = 1.0;
    this.pixel_ratio_display_over_true_y = 1.0;
    this.is_active = true;
    this.text = ""
  }

  _onClick(e){
    var offsetX = e.offsetX; // =>要素左上からのx座標
    var offsetY = e.offsetY; // =>要素左上からのy座標

    if (this.is_search_upper_left) {
      this.upper_left_pos["x"] = Math.round(offsetX/this.pixel_ratio_display_over_true_x);
      this.upper_left_pos["y"] = Math.round(offsetY/this.pixel_ratio_display_over_true_y);
      this.is_search_upper_left = false;
    } else {
      this.lowwer_right_pos["x"] = Math.round(offsetX/this.pixel_ratio_display_over_true_x);
      this.lowwer_right_pos["y"] = Math.round(offsetY/this.pixel_ratio_display_over_true_y);
      this.is_search_upper_left = true;
    }
  }

  onClick(e){
    if (this.is_active) {
      this._onClick(e);
    }
  }

  clearCanvas(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  _draw(offsetX, offsetY){
    if (this.is_search_upper_left) {
      if (this.upper_left_pos["x"] != null && this.upper_left_pos["y"] != null && this.lowwer_right_pos["x"] != null && this.lowwer_right_pos["y"] != null) {  // 値が入って入るとき
        this.ctx.beginPath();
        this.ctx.strokeStyle = "orange";
        this.ctx.strokeRect(
          Math.round(this.pixel_ratio_display_over_true_x*this.upper_left_pos["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.upper_left_pos["y"]),
          Math.round(this.pixel_ratio_display_over_true_x*(this.lowwer_right_pos["x"]-this.upper_left_pos["x"])),
          Math.round(this.pixel_ratio_display_over_true_y*(this.lowwer_right_pos["y"]-this.upper_left_pos["y"]))
        );
        this.ctx.font = "30px monospace";
        this.ctx.fillStyle = "orange";
        this.ctx.fillText(
          this.text,
          Math.round(this.pixel_ratio_display_over_true_x*this.upper_left_pos["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.upper_left_pos["y"])
          );
        this.ctx.closePath();
      }
    } else {
      if (offsetX != null && offsetY != null && this.upper_left_pos["x"] != null && this.upper_left_pos["y"] != null) {  // 値が入って入るとき
        this.ctx.beginPath();
        this.ctx.strokeStyle = "blue";
        this.ctx.strokeRect(
          Math.round(this.pixel_ratio_display_over_true_x*this.upper_left_pos["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.upper_left_pos["y"]),
          Math.round(offsetX-this.pixel_ratio_display_over_true_x*this.upper_left_pos["x"]),
          Math.round(offsetY-this.pixel_ratio_display_over_true_y*this.upper_left_pos["y"])
        );
        this.ctx.font = "30px monospace";
        this.ctx.fillStyle = "blue";
        this.ctx.fillText(
          this.text,
          Math.round(this.pixel_ratio_display_over_true_x*this.upper_left_pos["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.upper_left_pos["y"])
          );
        this.ctx.closePath(); 
      }      
    }
  }

  draw(offsetX, offsetY) {
    if (this.is_active) {
      this._draw(offsetX, offsetY)
    }
  }

  setPixelRatio(pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_y) {
    console.log("set_pixel_ratio:",pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_y)
    this.pixel_ratio_display_over_true_x = pixel_ratio_display_over_true_x;
    this.pixel_ratio_display_over_true_y = pixel_ratio_display_over_true_y;
  }

  setText(text) {
    this.text = text;
  }

  setPos(pos_dict) {
    if (pos_dict!=null) {
      let w = pos_dict["x2"] - pos_dict["x1"]
      let h = pos_dict["y2"] - pos_dict["y1"]

      if (w!=0 && h!=0){
        this.upper_left_pos = {"x":pos_dict["x1"],"y":pos_dict["y1"]};
        this.lowwer_right_pos = {"x":pos_dict["x2"],"y":pos_dict["y2"]};
      } else {
        this.upper_left_pos = {"x":null, "y":null};
        this.lowwer_right_pos = {"x":null, "y":null};   
      }
    } else {
      this.upper_left_pos = {"x":null, "y":null};
      this.lowwer_right_pos = {"x":null, "y":null};
    }
    console.log("box setted:",this.upper_left_pos, this.lowwer_right_pos)
    this.is_search_upper_left = true;  // どちらもセットするため
  }

  activate() {
    this.is_active = true;
  }

  deactivate() {
    this.is_active = false;
  }

  toDict() {
    if (!this.is_search_upper_left) { // 右下を探している場合(矩形が確定していない場合) 
      console.log("to dict called: null 1")
      return null;
    }
    var w = this.lowwer_right_pos["x"] - this.upper_left_pos["x"]
    var h = this.lowwer_right_pos["y"] - this.upper_left_pos["y"]
    if ((w==0 || h==0) || this.upper_left_pos["x"]==null || this.upper_left_pos["y"]==null || this.lowwer_right_pos["x"]==null || this.lowwer_right_pos["y"]==null) { // 値が不適切な場合
      console.log("to dict called: null 2")
      return null
    }

    var out_dict = {"x1":this.upper_left_pos["x"], "y1":this.upper_left_pos["y"], "x2":this.lowwer_right_pos["x"], "y2":this.lowwer_right_pos["y"]}
    console.log("to dict called:",out_dict)
    return out_dict
  }
}


function calculate_point_distance(point_dict1, point_dict2) { // 二点の距離計算
  // polygon内で利用
  return Math.sqrt((point_dict1["x"]-point_dict2["x"])**2+(point_dict1["y"]-point_dict2["y"])**2)
}


function calculate_point_line_distance(line_point_dict1, line_point_dict2, point_dict) { // 二点を通る直線とある点の距離
  // polygon内で利用
  var num = Math.abs(
    (line_point_dict1["x"]-point_dict["x"]) * (line_point_dict2["y"]-point_dict["y"]) +
    (line_point_dict2["x"]-point_dict["x"]) * (line_point_dict1["y"]-point_dict["y"])
  )
  var den = Math.sqrt((line_point_dict2["x"]-line_point_dict1["x"])**2+(line_point_dict2["y"]-line_point_dict1["y"])**2)
  return num/den
}


function calculate_line_segment_leg(line_point_dict1, line_point_dict2, point_dict) {// 垂線の足の座標を求める
  // polygon内で利用
  var C_num = (point_dict["x"]-line_point_dict1["x"])*(line_point_dict2["x"]-line_point_dict1["x"]) 
  + (point_dict["y"]-line_point_dict1["y"])*(line_point_dict2["y"]-line_point_dict1["y"]);
  var C_den = (line_point_dict2["x"]-line_point_dict1["x"])**2 + (line_point_dict2["y"]-line_point_dict1["y"])**2
  var leg_x = line_point_dict1["x"] + C_num/C_den*(line_point_dict2["x"]-line_point_dict1["x"])
  var leg_y = line_point_dict1["y"] + C_num/C_den*(line_point_dict2["y"]-line_point_dict1["y"])
  return {"x":leg_x, "y":leg_y}
}


class CanvasPolygon{
  constructor (canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.roi_polygon_pos_list = []; //　多角形の点のリスト
    this.is_roi_polygon_closed = null; //多角形が閉じているかどうか
    this.roi_point_index = null; // 現在選択している点のインデックス
    this.clicked = false; //　ダブルクリックの判定に使う

    this.pixel_ratio_display_over_true_x = 1.0;
    this.pixel_ratio_display_over_true_y = 1.0;
    this.is_active = true;
    this.text = ""
  }

  initialize() {
    // 各プロパティの初期化
    this.roi_polygon_pos_list = []; //　多角形の点のリスト
    this.is_roi_polygon_closed = null; //多角形が閉じているかどうか
    this.roi_point_index = null; // 現在選択している点のインデックス
    this.clicked = false; //　ダブルクリックの判定に使う
  }

  onSingleLeftClick (e) {
    console.log("left single clicked")
    var offsetX = e.offsetX; // =>要素左上からのx座標
    var offsetY = e.offsetY; // =>要素左上からのy座標
    
    if (this.is_roi_polygon_closed) {  // ポリゴンが閉じていた場合，新しいポリゴンの始点を選択する．
      if (this.roi_point_index==null) { // 既存の点が選択されていない場合
        this.is_roi_polygon_closed = false;  // ポリゴンの開放
        this.roi_polygon_pos_list = []; // リストの初期化
        this.roi_polygon_pos_list.push(
          {"x":Math.round(offsetX/this.pixel_ratio_display_over_true_x),
           "y":Math.round(offsetY/this.pixel_ratio_display_over_true_y)}
        )
      } else { // 既存の点が選択されている場合
        this.roi_polygon_pos_list[this.roi_point_index]["x"] = Math.round(offsetX/this.pixel_ratio_display_over_true_x)
        this.roi_polygon_pos_list[this.roi_point_index]["y"] = Math.round(offsetY/this.pixel_ratio_display_over_true_y)
        this.roi_point_index = null; // 選択が終了
      }
    } else { // 閉じていなかった場合，新しく点を追加
      this.roi_polygon_pos_list.push(
        {"x":Math.round(offsetX/this.pixel_ratio_display_over_true_x), "y":Math.round(offsetY/this.pixel_ratio_display_over_true_y)}
      )
    }
  }

  _onRightClick(e){
    console.log("right clicked")
    var offsetX = e.offsetX; // =>要素左上からのx座標
    var offsetY = e.offsetY; // =>要素左上からのy座標

    var pos_dict = {"x":Math.round(offsetX/this.pixel_ratio_display_over_true_x), "y":Math.round(offsetY/this.pixel_ratio_display_over_true_y)}
    var min_distance = null;
    var min_distance_index = null;

    // 距離の最小となる点を求める
    for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
      var one_point = this.roi_polygon_pos_list[index]
      if (index==0) {
        min_distance = calculate_point_distance(pos_dict, one_point);
        min_distance_index = 0;
      } else {
        var distance = calculate_point_distance(pos_dict, one_point);
        if (distance<min_distance) {
          min_distance = distance
          min_distance_index = index
        }
      }
    }
    
    this.roi_point_index = null; // ここで一応初期化

    if (this.is_roi_polygon_closed) { // ポリゴンが閉じていた場合
      if (min_distance_index!=null) { // 距離の最小な点が存在する場合
        this.roi_point_index = min_distance_index // ここでのみ点を選択(このメソッド内で)
      } 
    } else { // ポリゴンが閉じていない場合
      if (min_distance_index==0) {  // 距離の最小な点が開始点の場合，ポリゴンがうまくとじるように調整
        this.roi_polygon_pos_list.push(this.roi_polygon_pos_list[0]) // 最後の点==最初の点
        this.is_roi_polygon_closed = true; // ここでのみポリゴンを閉じる
      } 
    }
    return false; // 右クリック特有の処理
  }

  onRightClick(e) {
    if (this.is_active) {
      this._onRightClick(e)
    }
    return false; // 右クリック特有の処理
  }
  
  onDoubleLeftClick(e) {
    console.log("left double clicked")
    var offsetX = e.offsetX; // =>要素左上からのx座標
    var offsetY = e.offsetY; // =>要素左上からのy座標

    var pos_dict = {"x":Math.round(offsetX/this.pixel_ratio_display_over_true_x), "y":Math.round(offsetY/this.pixel_ratio_display_over_true_y)}
    var min_point_line_distance = null;
    var min_point_line_distance_index = null; // 2点の最初の方
    // 連続する2点との距離の和が最小となる最初の点を求める
    for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
      if (index==0) { // 最初の場合
        var one_point = this.roi_polygon_pos_list[index]
        var two_point = this.roi_polygon_pos_list[index+1]
        // 垂線の足を求める
        var leg_point = calculate_line_segment_leg(one_point, two_point, pos_dict);
        if ( 
          (Math.min(one_point["x"],one_point["x"]) <= leg_point["x"] && Math.min(one_point["y"],one_point["y"]) <= leg_point["y"]) &&
          (leg_point["x"] <= Math.max(one_point["x"],one_point["x"])  && leg_point["y"] <= Math.max(one_point["y"],one_point["y"]))
        ) { // 垂線の足が線分内にある時
          min_point_line_distance = calculate_point_line_distance(one_point, two_point, pos_dict); // 点と直線の距離
        } else {
          var half_point = {"x":(one_point["x"]+two_point["x"])/2, "y":(one_point["y"]+two_point["y"])/2}; // 辺の中心点
          min_point_line_distance = calculate_point_distance(half_point, pos_dict); // 点と辺の中心点との距離
        }
        min_point_line_distance_index = 0;
      } else　if (index!=(this.roi_polygon_pos_list.length-1)) {
          var one_point = this.roi_polygon_pos_list[index]
          var two_point = this.roi_polygon_pos_list[index+1]
          // 垂線の足を求める
          var leg_point = calculate_line_segment_leg(one_point, two_point, pos_dict);
          if ( 
            (Math.min(one_point["x"],one_point["x"]) <= leg_point["x"] && Math.min(one_point["y"],one_point["y"]) <= leg_point["y"]) &&
            (leg_point["x"] <= Math.max(one_point["x"],one_point["x"])  && leg_point["y"] <= Math.max(one_point["y"],one_point["y"]))
          ) { // 垂線の足が線分内にある時
            var point_line_distance = calculate_point_line_distance(one_point, two_point, pos_dict); // 点と直線の距離
          } else {
            var half_point = {"x":(one_point["x"]+two_point["x"])/2, "y":(one_point["y"]+two_point["y"])/2}; // 辺の中心点
            var point_line_distance = calculate_point_distance(half_point, pos_dict);// 点と辺の中心点との距離
          } 
              
          if (point_line_distance<min_point_line_distance) {
            min_point_line_distance = point_line_distance
            min_point_line_distance_index = index
          }
      }
    }

    if (this.is_roi_polygon_closed) { // ポリゴンが閉じている場合
      if (min_point_line_distance_index!=null) {
        this.roi_polygon_pos_list.splice(min_point_line_distance_index+1, 0, pos_dict) // insertする
        this.roi_point_index = min_point_line_distance_index+1
      }
    }
  }
  
  _onLeftClick(e) {
    if (this.is_roi_polygon_closed) { // ポリゴンが閉じている場合
      // クリックフラグが立っている状態でのクリック
      //     -> ダブルクリック
      if (this.clicked) {
        this.clicked = false;
        this.onDoubleLeftClick(e);
        return;
      }
      // シングルクリックを受理、200ms間だけダブルクリック判定を残す
      this.clicked = true;
      var time_outed_func = () => {
        // ダブルクリックによりclickedフラグがリセットされていない
        //     -> シングルクリックだった
        if (this.clicked) {
            this.onSingleLeftClick(e);
        }
        this.clicked = false;
      }
      setTimeout(time_outed_func, 200);

    } else { //  ポリゴンが閉じていない場合
      this.onSingleLeftClick(e);
      this.clicked=false;
    }
  }

  onLeftClick(e) {
    if (this.is_active) {
      this._onLeftClick(e);
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  _drawPolygon(offsetX, offsetY){
    if (this.is_roi_polygon_closed) { // ポリゴンが閉じている場合
      var counter = 0
      this.ctx.beginPath();
      for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
        var point_dict = this.roi_polygon_pos_list[index]
        if (counter==0){  // 最初の点のみ
          if (counter==this.roi_point_index && offsetX!=null && offsetY!=null) { // 選択している点だった場合
            this.ctx.moveTo(
              offsetX,
              offsetY,
            );
          } else {
            this.ctx.moveTo(
              Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]),
              Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"])
            );
          }
        } else if(counter!=(this.roi_polygon_pos_list.length-1)) {  // 最初の点・最後の点(最初の点と同じ)以外
          if (counter==this.roi_point_index && offsetX!=null && offsetY!=null) { // 選択している点だった場合
            this.ctx.lineTo(
              offsetX,
              offsetY,
            );
          } else {
            this.ctx.lineTo(
              Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]),
              Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"])
            );
          }
        }
        counter ++;
      }
      this.ctx.closePath();
      if (this.roi_point_index==null) { // ポリゴンが確定している場合のみfill描画
        this.ctx.fillStyle = "red";
        this.ctx.globalAlpha = 0.5;
        this.ctx.fill();

        this.ctx.fillText(
          this.text,
          Math.round(this.pixel_ratio_display_over_true_x*this.roi_polygon_pos_list[0]["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.roi_polygon_pos_list[0]["y"])
        );

      } else {
        this.ctx.strokeStyle = "orange";
        this.ctx.stroke();

        this.ctx.fillStyle = "orange";
        this.ctx.fillText(
          this.text,
          Math.round(this.pixel_ratio_display_over_true_x*this.roi_polygon_pos_list[0]["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.roi_polygon_pos_list[0]["y"])
        );
      }
    } else { // ポリゴンが閉じていない場合
      var counter = 0
      this.ctx.beginPath();
      for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
        var point_dict = this.roi_polygon_pos_list[index]
        if (counter==0) {  // 最初の点のみ
          this.ctx.moveTo(
            Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]),
            Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"])
          );
        } else {  // 最初の点・最後の点以外
          this.ctx.lineTo(
            Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]),
            Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"])
          );
        } 
        counter ++;
      }
      this.ctx.lineTo(
        offsetX,
        offsetY
        );
      this.ctx.strokeStyle = "blue";
      this.ctx.stroke();
      if (this.roi_polygon_pos_list.length > 0) {
        this.ctx.fillStyle = "blue";
        this.ctx.fillText(
          this.text,
          Math.round(this.pixel_ratio_display_over_true_x*this.roi_polygon_pos_list[0]["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*this.roi_polygon_pos_list[0]["y"])
        );
      }
    }
  }

  drawPolygon(offsetX, offsetY) {
    if (this.is_active) {
      this._drawPolygon(offsetX, offsetY);
    }
  }

  _drawPoints(offsetX, offsetY) {
    if (this.is_roi_polygon_closed) { // ポリゴンが閉じている場合
      for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
        var point_dict = this.roi_polygon_pos_list[index];
        if (index==this.roi_point_index && offsetX!=null && offsetY!=null) {
          this.ctx.beginPath();
          this.ctx.arc(offsetX,offsetY, 2, 0, 2*Math.PI, false);
          this.ctx.fillStyle = "red";
          this.ctx.fill();
        } else if (index!=(this.roi_polygon_pos_list.length-1)) {  // 最初の点・最後の点(最初の点と同じ)以外
          this.ctx.beginPath();
          this.ctx.arc(
            Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]), 
            Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"]),
            2, 
            0, 
            2*Math.PI, 
            false);
          this.ctx.fillStyle = "red";
          this.ctx.fill();
        }
      }
    } else { // ポリゴンが閉じていない場合
      for (let index=0; index<this.roi_polygon_pos_list.length; index++) {
        var point_dict = this.roi_polygon_pos_list[index];
        this.ctx.beginPath();
        this.ctx.arc(
          Math.round(this.pixel_ratio_display_over_true_x*point_dict["x"]),
          Math.round(this.pixel_ratio_display_over_true_y*point_dict["y"]),
          2,
          0, 
          2*Math.PI, 
          false);
        this.ctx.fillStyle = "blue";
        this.ctx.fill();
      }
      if (offsetX!=null && offsetY!=null){
        this.ctx.beginPath();
        this.ctx.arc(offsetX, offsetY, 2, 0, 2*Math.PI, false);
        this.ctx.fillStyle = "blue";
        this.ctx.fill();    
      }
    }
  }

  drawPoints(offsetX, offsetY) {
    if (this.is_active) {
      this._drawPoints(offsetX, offsetY);
    }
  }

  setPixelRatio(pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_y) {
    console.log("set_pixel_ratio:",pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_y)
    this.pixel_ratio_display_over_true_x = pixel_ratio_display_over_true_x;
    this.pixel_ratio_display_over_true_y = pixel_ratio_display_over_true_y;
  }

  setText(text) {
    this.text = text;
  }

  setPos(polygon_pos_list) {
    if (polygon_pos_list.length > 0) {
      if (
        polygon_pos_list[0]["x"]==polygon_pos_list[polygon_pos_list.length-1]["x"] &&
        polygon_pos_list[0]["y"]==polygon_pos_list[polygon_pos_list.length-1]["y"]
      ) { // 正しくポリゴンが閉じている場合
          let is_all_same = true; // 全て同じかどうか
          for (let index=1;index<polygon_pos_list.length-1;index++) {
            if (
              polygon_pos_list[index]["x"]!=polygon_pos_list[0]["x"] ||
              polygon_pos_list[index]["y"]!=polygon_pos_list[0]["y"]
              ) {
                is_all_same = false;
              }  
          }
          if (is_all_same) { // 全て同じ場合
            this.roi_polygon_pos_list = null;
          } else { // 全て同じでない場合
            this.roi_polygon_pos_list = polygon_pos_list
          }
      } else { // 閉じていない場合
          polygon_pos_list.push(polygon_pos_list[0])
          this.roi_polygon_pos_list = polygon_pos_list
      }
    } else { // 長さが0の場合
        this.roi_polygon_pos_list = null;
    }
    console.log("polygon setted:",this.roi_polygon_pos_list)
    this.is_roi_polygon_closed = true;  // 全てセットするため
  }

  activate() {
    this.is_active = true;
  }

  deactivate() {
    this.is_active = false;
  }

  toList() {
    if (!this.is_roi_polygon_closed) { // ポリゴンが閉じていない場合 
      console.log("to list called: null 1")
      return null;
    }

    // 長さが0の場合
    if(this.roi_polygon_pos_list.length==0) {
      console.log("to list called: null 2")
      return null;
    }

    // 簡易面積チェック
    for (let index=1; index<(this.roi_polygon_pos_list.length-1); index++) { // 最初と最後を除く
      if (this.roi_polygon_pos_list[index]==this.roi_polygon_pos_list[0]) { // 最初の値と同じ場合
        console.log("to list called: null 3")
        return null;
      }
    }

    var out_list = this.roi_polygon_pos_list
    console.log("to list called:", out_list)
    return out_list
  }
  makeBox() { // ポリゴンから矩形を作成
    if (!this.is_roi_polygon_closed) { // ポリゴンが閉じていない場合 
      console.log("make box called: null 1")
      return null;
    }

    // 長さが0の場合
    if(this.roi_polygon_pos_list.length==0) {
      console.log("make box called: null 2")
      return null;
    }

    // 簡易面積チェック
    for (let index=1; index<(this.roi_polygon_pos_list.length-1); index++) { // 最初と最後を除く
      if (this.roi_polygon_pos_list[index]==this.roi_polygon_pos_list[0]) { // 最初の値と同じ場合
        console.log("make box called: null 3")
        return null;
      }
    }

    var x_pos_list = []
    var y_pos_list = []
    for (let index=0; index<(this.roi_polygon_pos_list.length); index++) {
      var pos_dict = this.roi_polygon_pos_list[index]
      x_pos_list.push(pos_dict["x"])
      y_pos_list.push(pos_dict["y"])
    }

    var x_pos_max = x_pos_list.reduce((a, b) => {
      return Math.max(a, b);
    })
    var x_pos_min = x_pos_list.reduce((a, b) => {
      return Math.min(a, b);
    })
    var y_pos_max = y_pos_list.reduce((a, b) => {
      return Math.max(a, b);
    })
    var y_pos_min = y_pos_list.reduce((a, b) => {
      return Math.min(a, b);
    })
    var out_dict = {"x1":x_pos_min, "y1":y_pos_min, "x2":x_pos_max, "y2":y_pos_max}

    console.log("make box called:",out_dict)
    return out_dict
  }
}


// shown-img, shown-canvasについて
var shown_img = document.getElementById("shown-img")
shown_img.src = "static/読み込み中.png" // 最初は固定の値

// 現在roiの描画
let shown_canvas_wrapper = document.getElementById("shown-canvas-wrapper")
function setSizeCanvasWrapper(){
  var shown_img = document.getElementById("shown-img")
  console.log("shown_img width, height:",shown_img.width,shown_img.height)
  shown_canvas_wrapper.width = shown_img.width  // canvas-wrapperのサイズを画像に合わせる
  shown_canvas_wrapper.height = shown_img.height  // canvas-wrapperのサイズを画像に合わせる
  console.log("shown-canvas-wrapper setted: width, height:",shown_canvas_wrapper.width, shown_canvas_wrapper.height)
}
setSizeCanvasWrapper(); // 通常は読み込んだ後に一度呼ばれる

let shown_canvas = document.getElementById("shown-canvas")
let ctx = shown_canvas.getContext("2d")

// canvasBoxのコンストラクト
let roi_box = new CanvasBox(shown_canvas, ctx);
roi_box.activate();
roi_box.text = String(roi_object_id);

// canvasPolygonのコンストラクト
let roi_polygon = new CanvasPolygon(shown_canvas, ctx);
roi_polygon.deactivate();
roi_polygon.text = String(roi_object_id)

function setSizeCanvas(){
  var shown_img = document.getElementById("shown-img")
  console.log("shown_img width, height:",shown_img.width,shown_img.height)
  shown_canvas.width = shown_img.width  // canvasのサイズを画像に合わせる
  shown_canvas.height = shown_img.height  // canvasのサイズを画像に合わせる
  console.log("shown-canvas setted: width, height:",shown_canvas.width, shown_canvas.height)
}
setSizeCanvas(); // 通常は読み込んだ後に一度呼ばれる

setSizeRatio = () => {
  var shown_img = document.getElementById("shown-img")
  if (true_width!=null && true_height!=null) {
    pixel_ratio_display_over_true_x = shown_img.width / true_width
    pixel_ratio_display_over_true_y = shown_img.height / true_height
    roi_box.setPixelRatio(pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_x)
    roi_polygon.setPixelRatio(pixel_ratio_display_over_true_x, pixel_ratio_display_over_true_x)
  }
}

setSizeRatio();

function clearCanvas() {
  ctx.clearRect(0, 0, shown_canvas.width, shown_canvas.height)
}

picOnMove = (e) => {
  var offsetX = e.offsetX; // =>要素左上からのx座標
  var offsetY = e.offsetY; // =>要素左上からのy座標
  if (! is_wait_action) {  // 待ち時間でない場合
    clearCanvas();
    roi_box.draw(offsetX, offsetY);
    roi_polygon.drawPolygon(offsetX, offsetY);
    roi_polygon.drawPoints(offsetX, offsetY);
    drawNotRoiBox();
    drawNotRoiPolygon();
  }
}

shown_canvas.addEventListener(
  'click',
  (e) => {
    roi_box.onClick(e);
    roi_polygon.onLeftClick(e);
    picOnMove(e);
  });

shown_canvas.oncontextmenu= (e) => {
    roi_polygon.onRightClick(e);
    picOnMove(e);
    return false;
}; // addEventListenerはなぜか使えない

shown_canvas.addEventListener("mousemove", picOnMove);


// objectのラベルについて

class ScrollObjectItem extends HTMLElement{
  constructor(scrollobject, label, state, id_number) {
    super();

    this.scrollobject = scrollobject;
    this.label = label;
    this.state = state;
    this.id_number = id_number;

    this.text = document.createTextNode("Object: "+String(id_number));
    this.appendChild(this.text);

    this.remove_button = document.createElement("button");
    this.remove_button.innerHTML = "削除";
    this.appendChild(this.remove_button)

    this.appendChild(document.createElement("br"));

    this.radio_1 = document.createElement("input");
    this.radio_1.type = "radio";
    this.radio_1.name = "selected_"+String(id_number);  // radioで共通
    this.radio_1.innerHTML = "選択する"
    this.radio_1.checked = true
    
  
    this.radio_2 = document.createElement("input");
    this.radio_2.type = "radio";
    this.radio_2.name = "selected_"+String(id_number);  //  radioで共通
    this.radio_2.innerHTML= "選択しない"


    this.appendChild(this.radio_1);
    this.appendChild(this.radio_2);
    this.appendChild(document.createElement("br"));

    this.textbox_label_1 = document.createTextNode("ラベル");

    this.textbox_1 = document.createElement("input");
    this.textbox_1.type = "text";
    this.textbox_1.value = this.label;
    this.textbox_1.id = "label"+String(id_number);
    
    
    this.textbox_label_2 = document.createTextNode("状態");

    this.textbox_2 = document.createElement("input");
    this.textbox_2.type = "text";
    this.textbox_2.value = this.state;
    this.textbox_2.id = "state"+String(id_number);
    

    this.appendChild(this.textbox_label_1);
    this.appendChild(this.textbox_1);
    this.appendChild(document.createElement("br"));
    this.appendChild(this.textbox_label_2);
    this.appendChild(this.textbox_2);
    this.appendChild(document.createElement("br"));


    this.textbox_1.readOnly = false;
    this.textbox_2.readOnly = false;
    // this.textbox_1.disabled = true;
    // this.textbox_2.disabled = true;

    // addEventListener
    let rTfunc = (evnet) => this.removeThis();  // thisの固定 
    let cWfunc = (event) => this.convertWritable();  // thisの固定
    let cUWfunc = (event) => this.convertUnWritable();  // thisの固定

    let updateLabel = (event) => {
      console.log("label changed")
      this.label = parseInt(this.textbox_1.value);
    };  // thisの固定
    let updateState = (event) => {
      console.log("label changed")
      this.state = parseInt(this.textbox_2.value);
    };  // thisの固定

    this.remove_button.addEventListener("click", rTfunc);
    this.radio_1.addEventListener("click", cWfunc);
    this.radio_2.addEventListener("click", cUWfunc);
    this.textbox_1.addEventListener("input", updateLabel);
    this.textbox_2.addEventListener("input", updateState);
  };

  convertWritable() {
    console.log("convertWritable of scrollitem "+String(this.id_number))
    this.textbox_1.readOnly = false;
    this.textbox_2.readOnly = false;

    this.textbox_1.style.backgroundColor = "white"
    this.textbox_2.style.backgroundColor = "white"

    //document.getElementById("label"+String(this.id_number)).disable = false;
    //document.getElementById("state"+String(this.id_number)).disable = false;
  };

  convertUnWritable() {
    console.log("convertUnWritable of scrollitem "+String(this.id_number))
    this.textbox_1.readOnly = true;
    this.textbox_2.readOnly = true;

    this.textbox_1.style.backgroundColor = "gray"
    this.textbox_2.style.backgroundColor = "gray"

    //document.getElementById("label"+String(this.id_number)).disable = true;
    //document.getElementById("state"+String(this.id_number)).disable = true;
  };

  removeThis() {
    console.log("removeThis "+String(this.id_number))
    this.scrollobject.removeOne(this.id_number)
  };

  setLabel(label, state) {
    this.textbox_1.value = label
    this.label = label
    this.textbox_2.value = state
    this.state = state
  }
}

window.customElements.define('scroll-object-item', ScrollObjectItem);  // 新規オブジェクトの登録

class ScrollObject extends HTMLElement{
  constructor() {
    super();
    this.object_id_counter = 0;
    this.scroll_dict = {}; // こっちは辞書
  }

  mygetOne(object_id) {
    var key = "object_"+String(object_id)
    if (String(key) in this.scroll_dict){
      return  this.scroll_dict[key]
    }
  }

  createOne() {  // 要素の中身はチェックしないことに注意 要素なんかのチェックに使う
    console.log("scrollobjectitem created key:", "object_"+String(this.object_id_counter));
    var scroll_object_item = new ScrollObjectItem(this, 0, 0, this.object_id_counter);
    this.scroll_dict["object_"+String(this.object_id_counter)] = scroll_object_item;
    this.appendChild(scroll_object_item);
    this.object_id_counter ++;
    console.log("scroll_dict:", this.scroll_dict)
  }

  removeOne(object_id) {
    var key = "object_"+String(object_id)
    console.log("scrollobjectitem removed key:", key)
    if (String(key) in this.scroll_dict){  // 削除
      this.removeChild(this.scroll_dict[key]);
      delete this.scroll_dict[key];
    };
    console.log("scroll_dict:", this.scroll_dict)
  }

  getObjectDict(){
    var  object_dict = {}
    for(var key in this.scroll_dict) {
      object_dict[key] = {
        "label": this.scroll_dict[key].label,
        "state": this.scroll_dict[key].state,
        "object_id": this.scroll_dict[key].id_number
      }
    }
    return object_dict
  }

  setAllLabel(frame_dict) {
    for (var object_key in frame_dict) {
      var label = frame_dict[object_key]["label"];
      var state = frame_dict[object_key]["state"];
      this.scroll_dict[object_key].setLabel(label, state);
    }
  }
}


window.customElements.define('scroll-object', ScrollObject);  // 新規オブジェクトの登録

// scrollobjectのインスタンス化
var scrollobject = new ScrollObject();
scrollobject.id = "scroll-object-1"

scroll_object_wrapper = document.getElementById("scroll-object-wrapper")
scroll_object_wrapper.appendChild(scrollobject);

// 新しいオブジェクトのボタン
var create_button = document.getElementById("createbutton")

function appendScrollObjectItem(event){
  scrollobject.createOne()
}

create_button.addEventListener("click", appendScrollObjectItem)
// デフォルトでひとつ作っておく
appendScrollObjectItem();


// 画面遷移で行うこと
function incSrcpic() { // shown_imgを一つ進める
  if (!is_wait_image_change) {
    if (frame_index+1 < pic_source_list.length) {
      frame_index ++;
    } 
    shown_img.src = pic_source_list[frame_index]
  }
}

function decSrcpic() {  // shown_imgを一つ減らす
  if (!is_wait_image_change) {
    if (frame_index-1 >= 0) {
      frame_index --;
    }
    shown_img.src = pic_source_list[frame_index]
  }
}

updateRoi = (e) => {
  if (roi_polygon.is_active) { // polygonがactiveな場合
    var pos_dict = roi_polygon.makeBox();
    var polygon_pos_list = roi_polygon.toList();
  } else { // ポリゴンが非activeな場合
    var pos_dict = roi_box.toDict();
    var polygon_pos_list = roi_polygon.toList();
  }
  
  var frame_key = "frame_"+String(frame_index)
  var roi_object_key = "object_"+String(roi_object_id)

  if (frame_key in all_data_dict) {
    if (roi_object_key in all_data_dict[frame_key]) {
      all_data_dict[frame_key][roi_object_key]["pos"] = pos_dict;
      all_data_dict[frame_key][roi_object_key]["polygon"] = polygon_pos_list;
    } else {
      all_data_dict[frame_key][roi_object_key] = {"pos":null, "polygon":null,"label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
      all_data_dict[frame_key][roi_object_key]["pos"] = pos_dict;
      all_data_dict[frame_key][roi_object_key]["polygon"] = polygon_pos_list;
    } 
  } else {
    all_data_dict[frame_key] = {}  // frame_keyを初期化
    all_data_dict[frame_key][roi_object_key] = {"pos":null, "polygon":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
    all_data_dict[frame_key][roi_object_key]["pos"] = pos_dict;
    all_data_dict[frame_key][roi_object_key]["polygon"] = polygon_pos_list;
  } 
  console.log("updated all_data_dict:", all_data_dict)
}

function updateObjectDict() {  // roi,ラベル情報を更新する
  var object_dict = scrollobject.getObjectDict()
  var frame_key = "frame_"+String(frame_index)

  if (frame_key in all_data_dict) {
    for (var object_key in object_dict) {
      if (object_key in all_data_dict[frame_key]) {
        all_data_dict[frame_key][object_key]["label"] = object_dict[object_key]["label"] 
        all_data_dict[frame_key][object_key]["state"] = object_dict[object_key]["state"]
        all_data_dict[frame_key][object_key]["object_id"] = object_dict[object_key]["object_id"]
      } else {
        all_data_dict[frame_key][object_key] = {"pos":null, "polygon":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
        all_data_dict[frame_key][object_key]["label"] = object_dict[object_key]["label"] 
        all_data_dict[frame_key][object_key]["state"] = object_dict[object_key]["state"]
        all_data_dict[frame_key][object_key]["object_id"] = object_dict[object_key]["object_id"]
      }
    }
  } else {
    all_data_dict[frame_key] = {}  // frame_keyの部分を初期化
    for (var object_key in object_dict) {
      all_data_dict[frame_key][object_key] = {"pos":null, "polygon":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
      all_data_dict[frame_key][object_key]["label"] = object_dict[object_key]["label"] 
      all_data_dict[frame_key][object_key]["state"] = object_dict[object_key]["state"]
      all_data_dict[frame_key][object_key]["object_id"] = object_dict[object_key]["object_id"]
    }
  }
  console.log("updated all_data_dict:", all_data_dict)
}

postRoi = (e) => {  // roiを送信する
  let will_post = false; // postするかどうか
  if (roi_polygon.is_active) { // ポリゴンがactiveな場合
    var pos_dict = roi_polygon.makeBox();
    var polygon_pos_list = roi_polygon.toList();
    
    is_continue = false;
    if(polygon_pos_list!=null){
      will_post=true;
      if (polygon_pos_list.length==pre_polygon_pos_list.length){ //  長さが同じ場合
        let is_all_same = true;
        for (let index=0;index<polygon_pos_list.length;index++) {
          if (
            polygon_pos_list[index]["x"]!=pre_polygon_pos_list[index]["x"] ||
            polygon_pos_list[index]["y"]!=pre_polygon_pos_list[index]["y"]
            ) {
              is_all_same = false;
            }  
        }
        is_continue = is_all_same;
      } else if (polygon_pos_list.length==(pre_polygon_pos_list.length-1)) {// 長さが一つ小さい場合(preが閉じていないだけ)
        let is_all_same = true;
        for (let index=0;index<polygon_pos_list.length-1;index++) {
          if (
            polygon_pos_list[index]["x"]!=pre_polygon_pos_list[index]["x"] ||
            polygon_pos_list[index]["y"]!=pre_polygon_pos_list[index]["y"]
            ) {
              is_all_same = false;
            }  
        }
        is_continue = is_all_same;  
      }
    }
  } else { // ポリゴンが非activeな場合
      var pos_dict = roi_box.toDict(); 
      var polygon_pos_list = null;
      if (pos_dict!=null){
        will_post=true;
        if (pre_pos_dict["x1"] != null && pre_pos_dict["y1"] != null && pre_pos_dict["x2"] != null && pre_pos_dict["y2"] != null) {
          if (
            pos_dict["x1"] == pre_pos_dict["x1"] &&
            pos_dict["y1"] == pre_pos_dict["y1"] &&
            pos_dict["x2"] == pre_pos_dict["x2"] &&
            pos_dict["y2"] == pre_pos_dict["y2"]
          ) {  // pre と roiが同じ場合(受け取った結果と変更していない場合)
            is_continue = true
          } else {
            is_continue = false
          }
        }
      }
  }

  if (will_post) {
    is_wait_action = true  // keybord, move,clickイベントを待ってもらう
    console.log("post roi!")
    console.log({"bbox_dict":pos_dict, "polygon_list":polygon_pos_list ,"is_continue":is_continue, "frame": frame_index})
    $.ajax(
      {
      url:'/postbbox',
      type:'POST',
      data: JSON.stringify({"bbox_dict":pos_dict, "polygon_list":polygon_pos_list ,"is_continue":is_continue, "frame": frame_index}),
      dataType: "json",
      contentType: "application/json"
    })
    .done(function(response) {
      console.log("response:", response);
      var pos_dict = response["bbox_dict"];
      //console.log("responsed pos_dict:", pos_dict);
      
      var polygon_pos_list = response["polygon_list"];
      //console.log("responsed polygon_pos_list:",polygon_pos_list)
      
      pre_polygon_pos_list = polygon_pos_list;
      roi_polygon.setPos(polygon_pos_list)

      if (pos_dict==null && polygon_pos_list!=null){ // ポリゴンのみ与えられた場合
        console.log("created pos_dict from polygon:", pos_dict);
        pos_dict = roi_polygon.makeBox();
      }

      pre_pos_dict = pos_dict;  // 変更の確認に使う
      roi_box.setPos(pos_dict);

      canvasCrear();
      roi_box._draw(null,null); // is_activeに関わらず描画
      roi_polygon._drawPolygon(null,null); // is_activeに関わらず描画
      roi_polygon._drawPoints(null,null); // is_activeに関わらず描画

      drawNotRoiBox();
      drawNotRoiPolygon();
    })
    .fail(function(xhr) {
      initializeRoi();
    }) 
    .always(function(xhr,msg){
      is_wait_action = false
      if (is_auto_mode) {
        transition_n();  // 自身の呼び出し．再帰注意！
      }
    })
  }
}

function canvasCrear() {
  ctx.clearRect(0, 0, shown_canvas.width, shown_canvas.height);
}

initializeRoi = (e) => {
  roi_box.setPos({"x1":null,"y1":null,"x2":null,"y2":null});
  roi_polygon.setPos(null);
}

readRoi = () => {
  console.log("called readRoi")
  var frame_key = "frame_"+String(frame_index);
  var roi_object_key = "object_"+String(roi_object_id);
  if (frame_key in all_data_dict) {
    if (roi_object_key in all_data_dict[frame_key]) {
      var pos_dict = all_data_dict[frame_key][roi_object_key]["pos"];
      console.log("pos_dict:",pos_dict)
      roi_box.setPos(pos_dict);
      var polygon_pos_list = all_data_dict[frame_key][roi_object_key]["polygon"]
      console.log("polygon_list:",polygon_pos_list)
      roi_polygon.setPos(polygon_pos_list);
    }
  }
}

readObjectLabel = () => {
  console.log("called readObjectlLabel")
  var frame_key = "frame_"+String(frame_index);
  if (frame_key in all_data_dict) {
    var one_frame_dict = all_data_dict[frame_key]
    scrollobject.setAllLabel(one_frame_dict)
  }
}

function drawNotRoiBox(){
  var frame_key = "frame_"+String(frame_index)
  var roi_object_key = "object_"+String(roi_object_id)

  if (frame_key in all_data_dict) {
    for (var object_key in all_data_dict[frame_key]) {
      if (all_data_dict[frame_key][object_key]["pos"] != null && object_key != roi_object_key) {
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.strokeRect(
          Math.round(pixel_ratio_display_over_true_x*all_data_dict[frame_key][object_key]["pos"]["x1"]),
          Math.round(pixel_ratio_display_over_true_y*all_data_dict[frame_key][object_key]["pos"]["y1"]),
          Math.round(pixel_ratio_display_over_true_x*all_data_dict[frame_key][object_key]["pos"]["x2"]-all_data_dict[frame_key][object_key]["pos"]["x1"]),
          Math.round(pixel_ratio_display_over_true_y*all_data_dict[frame_key][object_key]["pos"]["y2"]-all_data_dict[frame_key][object_key]["pos"]["y1"])
        );
        ctx.font = "30px monospace";
        ctx.fillStyle = "red";
        ctx.fillText(
          String(all_data_dict[frame_key][object_key]["object_id"]),
          Math.round(all_data_dict[frame_key][object_key]["pos"]["x1"]),
          Math.round(all_data_dict[frame_key][object_key]["pos"]["y1"])
          );
        ctx.closePath();
      }
    }
  }
}

function drawNotRoiPolygon(){
  var frame_key = "frame_"+String(frame_index)
  var roi_object_key = "object_"+String(roi_object_id)

  if (frame_key in all_data_dict) {
    for (var object_key in all_data_dict[frame_key]) {
      let polygon_pos_list = all_data_dict[frame_key][object_key]["polygon"]
      if (polygon_pos_list!=null && object_key!=roi_object_key) {
        ctx.beginPath();
        for (let index=0;index<polygon_pos_list.length;index++) {
          point_dict = polygon_pos_list[index]
          if (index==0){
            ctx.moveTo(
              Math.round(pixel_ratio_display_over_true_x*point_dict["x"]),
              Math.round(pixel_ratio_display_over_true_y*point_dict["y"])
            );
          } else {
            ctx.lineTo(
              Math.round(pixel_ratio_display_over_true_x*point_dict["x"]),
              Math.round(pixel_ratio_display_over_true_y*point_dict["y"])
            );
          }
        }
        ctx.closePath();
        ctx.fillStyle = "green";
        ctx.globalAlpha = 0.5;
        ctx.fill();
      }
    }  
  }
}

changeRoiNext = () => {
  var object_dict = scrollobject.getObjectDict()
  var object_id_list = []
  for (var object_key in object_dict) {
    object_id_list.push(object_dict[object_key]["object_id"])
  };
  roi_object_id_index_counter ++;
  var roi_object_id_index = roi_object_id_index_counter % object_id_list.length;
  roi_object_id = object_id_list[roi_object_id_index];
  roi_box.text = String(roi_object_id);
  roi_polygon.text = String(roi_object_id);
};

addObjectAndChangeRoi = () => {
  appendScrollObjectItem();
  var object_dict = scrollobject.getObjectDict();
  var object_id_list = [];
  for (var object_key in object_dict) {
    object_id_list.push(object_dict[object_key]["object_id"]);
  };
  roi_object_id_index_counter = object_id_list.length - 1;
  var roi_object_id_index = roi_object_id_index_counter;
  roi_object_id = object_id_list[roi_object_id_index];
  roi_box.text = String(roi_object_id);
  roi_polygon.text = String(roi_object_id);
}

// windowにたいするイベント
transition_n = () => {
  postRoi();
  updateRoi();
  updateObjectDict();
  canvasCrear();
  incSrcpic();
  readObjectLabel();
  roi_box._draw(null,null); // 選択に依存しない
  roi_polygon._drawPolygon(null,null); // 選択に依存しない
  roi_polygon._drawPoints(null,null); // 選択に依存しない
  drawNotRoiBox();
  drawNotRoiPolygon();
}

transition_p = () => {
  canvasCrear();
  decSrcpic();
  readRoi();
  readObjectLabel();
  roi_box._draw(null,null); // 選択に依存しない
  roi_polygon._drawPolygon(null,null) // 選択に依存しない
  roi_polygon._drawPoints(null,null) // 選択に依存しない
  drawNotRoiBox();
  drawNotRoiPolygon()
}

transition_t = () => {
  canvasCrear();
  incSrcpic();
  readRoi();
  readObjectLabel();
  roi_box._draw(null,null); // 選択に依存しない
  roi_polygon._drawPolygon(null,null) // 選択に依存しない
  roi_polygon._drawPoints(null,null) // 選択に依存しない
  drawNotRoiBox();
  drawNotRoiPolygon()
}

change_state_c = () => {
  changeRoiNext();
  readRoi();
  roi_box.draw(null,null);
  roi_polygon.drawPolygon(null,null)
  roi_polygon.drawPoints(null,null)  
  drawNotRoiBox();
  drawNotRoiPolygon()
}

change_state_a = () => {
  addObjectAndChangeRoi();
  initializeRoi();
  roi_box.draw(null,null);
  roi_polygon.drawPolygon(null,null)
  roi_polygon.drawPoints(null,null)  
  drawNotRoiBox();
  drawNotRoiPolygon()
}

help_h = () => {
  window.open("/help");
  //window.open("templates/help.html")
}

function documentKeyDown(e){  // keydownのイベントハンドラ
  if (! is_wait_action && ! is_wait_image_change) {  // 待ち時間でない場合
    if (e.key=="n") {
      transition_n();
    } else if (e.key=="p") {
      transition_p();
    } else if (e.key=="c") {
      change_state_c();
    } else if (e.key=="a") {
      change_state_a();
    } else if (e.key=="t") {
      transition_t();
    } else if (e.key=="h") {
      help_h();
    }
  }
}

documentResize = (e) => {  // windowのresizeのイベント
  setSizeCanvasWrapper();
  setSizeCanvas();
  setSizeRatio();
  roi_box.draw(null,null);
  roi_polygon.drawPolygon(null,null);
  roi_polygon.drawPoints(null,null);
  drawNotRoiBox();
  drawNotRoiPolygon();
}


document.addEventListener("keydown", documentKeyDown)
document.addEventListener("resize", documentResize)

// 保存ボタン
var save_button = document.getElementById("save-button")

save_button.addEventListener(
  "click",
  (e) => {
    shown_img.src = "static/書き出し中.png"; // 書き出しの値
    setSizeCanvas();
    setSizeCanvasWrapper();
    setSizeRatio();
    canvasCrear();
    is_wait_image_change = true;
    $.ajax({
      url: "/savealldata",
      type: "POST",
      data: JSON.stringify(all_data_dict),
      dataType: "json",
      contentType: 'application/json'
    })
    .done(function(response) {
      is_wait_image_change = false;
      shown_img.src = pic_source_list[frame_index]
      if (response["is_success"]) {
        alert("保存に成功しました")
      } else {
        alert("保存に失敗しました")
      }
    })
  }
)

var remove_cash_button = document.getElementById("remove-cash-button")

remove_cash_button.addEventListener(
  "click",
  (e) => {
    shown_img.src = "static/読み込み中.png";
    setSizeCanvas();
    setSizeCanvasWrapper();
    setSizeRatio();
    canvasCrear();
    frame_index = 0;
    all_data_dict = {};
    initializeRoi();
    $.ajax({
      url:"/removecash",
      type:"POST",
      //data: JSON.stringify({}),
      //dataType: "json",
      //contentType: 'application/json'
    })
  }
)

var auto_mode_on_radio = document.getElementById("auto-mode-on-radio")

auto_mode_on_radio.addEventListener(
  "change",
  (e) => {
    if (auto_mode_on_radio.checked) {
      is_auto_mode = true;
    }}
)

var auto_mode_off_radio = document.getElementById("auto-mode-off-radio")

auto_mode_off_radio.addEventListener(
  "change",
  (e) => {
    if (auto_mode_off_radio.checked) {
      is_auto_mode = false;
    }}
)

var box_mode_radio = document.getElementById("box-polygon-mode-box-radio")

box_mode_radio.addEventListener(
  "click",
  (e) => {
    if (!is_wait_action) {
      roi_box.activate();
      roi_polygon.deactivate();
    }
  }
)

var polygon_mode_radio = document.getElementById("box-polygon-mode-polygon-radio")

polygon_mode_radio.addEventListener(
  "click",
  (e) => {
    if (!is_wait_action) {
      roi_box.deactivate();
      roi_polygon.activate();
    }
  }
)


