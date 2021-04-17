//let all_data_dict = {"frame_0":{"object_0":{"pos":{"x1":null,"y1":null,"x2":null, "y2":null}, "label":null, "state":null, "object_id":null}}};
let all_data_dict = {}
let upper_left_pos = {"x":null, "y":null};
let lowwer_right_pos = {"x":null, "y":null};
let pre_upper_left_pos = {"x":null, "y":null};  // roiが変更されたかどうかで使う
let pre_lowwer_right_pos = {"x":null, "y":null};  // roiが変更されたかどうかで使う

let frame_index = 0;
var is_search_upper_left = true;
var roi_object_id = 0;
var roi_object_id_index_counter = 0;
var is_wait_action = false;
var is_wait_image_chenge = true;
var is_continue = false;

var pic_source_list = []

var roi_polygon_list = null

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
      frame_index = 0
      shown_img.src = pic_source_list[frame_index]
      if (!response["is_success"]) {
        alert("入力されたパスが間違っています．入力し直してください")
      } else {
        alert("パスを読み込みました，")
        is_wait_image_chenge = false;
      }
      setSizeCanvasWrapper();
      setSizeCanvas();
    })
    console.log("posted all path")
  } else {
    alert("入力ファイルパス(jsonは任意)，出力ファイルパスを全て入力してください")
  }
}

path_submit_button.addEventListener("click", postPaths)


// shown-img, shown-canvasについて
var shown_img = document.getElementById("shown-img")
shown_img.src = "static/読み込み中.png" // 最初は固定の値

function picOnClick(e) {
  let offsetX = e.offsetX; // =>要素左上からのx座標
  let offsetY = e.offsetY; // =>要素左上からのy座標

  document.getElementById("txtX").value = offsetX;
  document.getElementById("txtY").value = offsetY;

  if (! is_wait_action) {  // 待ち時間でない場合
    if (is_search_upper_left) {
      upper_left_pos["x"] = offsetX;
      upper_left_pos["y"] = offsetY;
      is_search_upper_left = false;
    } else {
      lowwer_right_pos["x"] = offsetX;
      lowwer_right_pos["y"] = offsetY;
      is_search_upper_left = true;
    }
    picOnMove(e);
  }
}

// 現在roiの描画
let shown_canvas_wrapper = document.getElementById("shown-canvas-wrapper")
function setSizeCanvasWrapper(){
  var shown_img = document.getElementById("shown-img")
  shown_canvas_wrapper.width = shown_img.width  // canvas-wrapperのサイズを画像に合わせる
  shown_canvas_wrapper.height = shown_img.height  // canvas-wrapperのサイズを画像に合わせる
  console.log("shown-canvas-wrapper setted: width:",shown_canvas_wrapper.width, shown_canvas_wrapper.height)
}
setSizeCanvasWrapper(); // 通常は読み込んだ後に一度呼ばれる

let shown_canvas = document.getElementById("shown-canvas")
function setSizeCanvas(){
  var shown_img = document.getElementById("shown-img")
  shown_canvas.width = shown_img.width  // canvasのサイズを画像に合わせる
  shown_canvas.height = shown_img.height  // canvasのサイズを画像に合わせる
  console.log("shown-canvas setted: width:",shown_canvas.width, shown_canvas.height)
}
setSizeCanvas(); // 通常は読み込んだ後に一度呼ばれる

let ctx = shown_canvas.getContext("2d")

function drawRoiBox(offsetX, offsetY){
  ctx.clearRect(0, 0, shown_canvas.width, shown_canvas.height)
  if (is_search_upper_left) {
    if (upper_left_pos["x"] != null && upper_left_pos["y"] != null) {  // 値が入って入るとき
      ctx.beginPath();
      ctx.strokeStyle = "orange";
      ctx.strokeRect(
        upper_left_pos["x"],
        upper_left_pos["y"],
        lowwer_right_pos["x"]-upper_left_pos["x"],
        lowwer_right_pos["y"]-upper_left_pos["y"]
      );
      ctx.font = "30px monospace";
      ctx.fillStyle = "orange";
      ctx.fillText(
        String(roi_object_id),
        upper_left_pos["x"],
        upper_left_pos["y"]
        );
      ctx.closePath();
    }
  } else {
    if (offsetX != null && offsetY != null) {  // 値が入って入るとき
      ctx.beginPath();
      ctx.strokeStyle = "blue";
      ctx.strokeRect(
        upper_left_pos["x"],
        upper_left_pos["y"],
        offsetX-upper_left_pos["x"],
        offsetY-upper_left_pos["y"]
      );
      ctx.font = "30px monospace";
      ctx.fillStyle = "blue";
      ctx.fillText(
        String(roi_object_id),
        upper_left_pos["x"],
        upper_left_pos["y"]
        );
      ctx.closePath(); 
    }      
  }
}

function picOnMove(e) {
  var offsetX = e.offsetX; // =>要素左上からのx座標
  var offsetY = e.offsetY; // =>要素左上からのy座標
  if (! is_wait_action) {  // 待ち時間でない場合
    drawRoiBox(offsetX, offsetY);
    drawNotRoiBox();
    drawRoiPolygon();
  }
}

shown_canvas.addEventListener('click', picOnClick);
shown_canvas.addEventListener("mousemove", picOnMove);


// objectのラベルについて

class ScrollObjectItem extends HTMLElement{
  constructor(scrollobject, label, state, id_number) {
    super();
    console.log("scrollobjectitem construct label:", label)
    console.log("scrollobjectitem construct state:", state)
    console.log("scrollobjectitem id_number:", id_number)

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
      console.log("label chenged")
      this.label = this.textbox_1.value;
    };  // thisの固定
    let updateState = (event) => {
      console.log("label chenged")
      this.state = this.textbox_2.value;
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
    console.log("this is scroll object mygetOne")
    if (String(key) in this.scroll_dict){
      console.log("can get from mygetOne")
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
  if (!is_wait_image_chenge) {
    if (frame_index+1 < pic_source_list.length) {
      frame_index ++;
    } 
    shown_img.src = pic_source_list[frame_index]
  }
}

function decSrcpic() {  // shown_imgを一つ減らす
  if (!is_wait_image_chenge) {
    if (frame_index-1 >= 0) {
      frame_index --;
    }
    shown_img.src = pic_source_list[frame_index]
  }
}

function updateRoi() {
  var roi_pos = {"x1":upper_left_pos["x"], "y1":upper_left_pos["y"], "x2":lowwer_right_pos["x"], "y2":lowwer_right_pos["y"]}

  if (upper_left_pos["x"]==null || upper_left_pos["y"]==null || lowwer_right_pos["x"]==null || lowwer_right_pos["y"]==null) {  // nullが含まれるばあい
    roi_pos = null
  } else {
    let w = lowwer_right_pos["x"] - upper_left_pos["x"]
    let h = lowwer_right_pos["y"] - upper_left_pos["y"]
    if (w == 0 || h == 0) {  // wかhがnullの場合
      roi_pos = null
    }
  }

  var frame_key = "frame_"+String(frame_index)
  var roi_object_key = "object_"+String(roi_object_id)

  if (frame_key in all_data_dict) {
    if (roi_object_key in all_data_dict[frame_key]) {
      all_data_dict[frame_key][roi_object_key]["pos"] = roi_pos
    } else {
      all_data_dict[frame_key][roi_object_key] = {"pos":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
      all_data_dict[frame_key][roi_object_key]["pos"] = roi_pos
    } 
  } else {
    all_data_dict[frame_key] = {}  // frame_keyを初期化
    all_data_dict[frame_key][roi_object_key] = {"pos":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
    all_data_dict[frame_key][roi_object_key]["pos"] = roi_pos
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
        all_data_dict[frame_key][object_key] = {"pos":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
        all_data_dict[frame_key][object_key]["label"] = object_dict[object_key]["label"] 
        all_data_dict[frame_key][object_key]["state"] = object_dict[object_key]["state"]
        all_data_dict[frame_key][object_key]["object_id"] = object_dict[object_key]["object_id"]
      }
    }
  } else {
    all_data_dict[frame_key] = {}  // frame_keyの部分を初期化
    for (var object_key in object_dict) {
      all_data_dict[frame_key][object_key] = {"pos":null, "label":null, "state":null, "object_id":null}  // object_keyの部分を初期化
      all_data_dict[frame_key][object_key]["label"] = object_dict[object_key]["label"] 
      all_data_dict[frame_key][object_key]["state"] = object_dict[object_key]["state"]
      all_data_dict[frame_key][object_key]["object_id"] = object_dict[object_key]["object_id"]
    }
  }
  console.log("updated all_data_dict:", all_data_dict)
}

function postRoi() {  // roiを送信する
  if (pre_upper_left_pos["x"] != null && pre_upper_left_pos["y"] != null && pre_lowwer_right_pos["x"] != null && pre_lowwer_right_pos["y"] != null) {
    if (
      upper_left_pos["x"] == pre_upper_left_pos["x"] &&
      upper_left_pos["y"] == pre_upper_left_pos["y"] &&
      lowwer_right_pos["x"] == pre_lowwer_right_pos["x"] &&
      lowwer_right_pos["y"] == pre_lowwer_right_pos["y"]
    ) {  // pre と roiが同じ場合(受け取った結果と変更していない場合)
      is_continue = true
    } else {
      is_continue = false
    }
  }
  
  var roi_xyxy = [
    upper_left_pos["x"],
    upper_left_pos["y"],
    lowwer_right_pos["x"],
    lowwer_right_pos["y"]
  ]

  if (upper_left_pos["x"] != null && upper_left_pos["y"] != null && lowwer_right_pos["x"] != null && lowwer_right_pos["y"] != null) {
    let w = lowwer_right_pos["x"] - upper_left_pos["x"]
    let h = lowwer_right_pos["y"] - upper_left_pos["y"]
    if (w != 0 && h != 0) {

      is_wait_action = true  // keybord, move,clickイベントを待ってもらう

      $.ajax(
        {
        url:'/postbbox',
        type:'POST',
        data: JSON.stringify({"bbox_xyxy":roi_xyxy, "is_continue":is_continue, "frame": frame_index}),
        dataType: "json",
        contentType: "application/json"
      })
      .done(function(response) {
        console.log("response:", response);
        var xyxy_list = response["bbox_xyxy"];
        console.log("xyxy_list:", xyxy_list);
        upper_left_pos["x"] = xyxy_list[0];
        upper_left_pos["y"] = xyxy_list[1];
        lowwer_right_pos["x"] = xyxy_list[2];
        lowwer_right_pos["y"] = xyxy_list[3];

        pre_upper_left_pos["x"] = xyxy_list[0];  // 変更の確認に使う
        pre_upper_left_pos["y"] = xyxy_list[1];  // 変更の確認に使う
        pre_lowwer_right_pos["x"] = xyxy_list[2];  // 変更の確認に使う
        pre_lowwer_right_pos["y"] = xyxy_list[3];  // 変更の確認に使う

        let w = lowwer_right_pos["x"] - upper_left_pos["x"]
        let h = lowwer_right_pos["y"] - upper_left_pos["y"]

        if (w == 0 || h == 0) {  // wかhが0の場合
          upper_left_pos["x"] = null;
          upper_left_pos["y"] = null;
          lowwer_right_pos["x"] = null;
          lowwer_right_pos["y"] = null;
        }
    
        var polygon_dict_list = [];
        for (var index in response["polygon"]) {
          polygon_dict_list.push({"x":response["polygon"][index][0], "y":response["polygon"][index][1]})
        }
        roi_polygon_list = polygon_dict_list;
        //roi_polygon_list = [{"x":100,"y":100},{"x":150,"y":200},{"x":200,"y":100},{"x":100,"y":100}]
        console.log("roi_polygon_list:", roi_polygon_list)
        drawRoiBox(null,null);
        drawNotRoiBox();
        drawRoiPolygon();
      })
      .fail(function(xhr) {
        initializeRoi();
        initializePolygon();
      }) 
      .always(function(xhr,msg){
        is_wait_action = false
      })
    }
  }

  is_search_upper_left = true
}

function canvasCrear() {
  ctx.clearRect(0, 0, shown_canvas.width, shown_canvas.height)
}

function initializeRoi() {
  upper_left_pos["x"] = null
  upper_left_pos["y"] = null
  lowwer_right_pos["x"] = null
  lowwer_right_pos["y"] = null
  is_search_upper_left = true
}

function readRoi() {
  var frame_key = "frame_"+String(frame_index)
  var roi_object_key = "object_"+String(roi_object_id)
  if (frame_key in all_data_dict) {
    if (roi_object_key in all_data_dict[frame_key]) {
      upper_left_pos["x"] = all_data_dict[frame_key][roi_object_key]["pos"]["x1"];
      upper_left_pos["y"] = all_data_dict[frame_key][roi_object_key]["pos"]["y1"];
      lowwer_right_pos["x"] = all_data_dict[frame_key][roi_object_key]["pos"]["x2"];
      lowwer_right_pos["y"] = all_data_dict[frame_key][roi_object_key]["pos"]["y2"];
    }
  }
  search_upper_left = true
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
          all_data_dict[frame_key][object_key]["pos"]["x1"],
          all_data_dict[frame_key][object_key]["pos"]["y1"],
          all_data_dict[frame_key][object_key]["pos"]["x2"]-all_data_dict[frame_key][object_key]["pos"]["x1"],
          all_data_dict[frame_key][object_key]["pos"]["y2"]-all_data_dict[frame_key][object_key]["pos"]["y1"]
        );
        ctx.font = "30px monospace";
        ctx.fillStyle = "red";
        ctx.fillText(
          String(all_data_dict[frame_key][object_key]["object_id"]),
          all_data_dict[frame_key][object_key]["pos"]["x1"],
          all_data_dict[frame_key][object_key]["pos"]["y1"]
          );
        ctx.closePath();
      }
    }
  }
}

function drawRoiPolygon(){
  if (roi_polygon_list!=null) {
    var counter = 0
    ctx.beginPath();
    for (var index in roi_polygon_list) {
      point_dict = roi_polygon_list[index]
      if (counter==0){
        ctx.moveTo(point_dict["x"],point_dict["y"]);
      } else {
        ctx.lineTo(point_dict["x"],point_dict["y"]);
      }
      counter ++;
    }
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.globalAlpha = 0.5;
    ctx.fill();
  }
}

function initializePolygon(){
  roi_polygon_list = null
}

function chengeRoiNext(){
  var object_dict = scrollobject.getObjectDict()
  var object_id_list = []
  for (var object_key in object_dict) {
    object_id_list.push(object_dict[object_key]["object_id"])
  };
  roi_object_id_index_counter ++;
  var roi_object_id_index = roi_object_id_index_counter % object_id_list.length
  roi_object_id = object_id_list[roi_object_id_index]
};

function addObjectAndChengeRoi(){
  appendScrollObjectItem();
  var object_dict = scrollobject.getObjectDict()
  var object_id_list = []
  for (var object_key in object_dict) {
    object_id_list.push(object_dict[object_key]["object_id"])
  };
  roi_object_id_index_counter = object_id_list.length - 1
  var roi_object_id_index = roi_object_id_index_counter % object_id_list.length  // ここは本当はいらない
  roi_object_id = object_id_list[roi_object_id_index]
}

function documentKeyDown(e){  // keydownのイベントハンドラ
  if (! is_wait_action && ! is_wait_image_chenge) {  // 待ち時間でない場合
    if (e.key=="n") {
      postRoi();
      updateRoi();
      updateObjectDict();
      canvasCrear();
      incSrcpic();
      drawRoiBox(null,null);
      drawNotRoiBox();
      drawRoiPolygon();
    } else if (e.key=="p") {
      canvasCrear();
      decSrcpic();
      readRoi();
      initializePolygon();
      drawRoiBox(null,null);
      drawNotRoiBox();
    } else if (e.key=="c") {
      chengeRoiNext();
      readRoi();
      drawRoiBox(null,null);
      drawNotRoiBox();
    } else if (e.key=="a") {
      addObjectAndChengeRoi();
      initializeRoi();
      drawNotRoiBox();
    } else if (e.key=="t") {
      canvasCrear();
      incSrcpic();
      readRoi();
      initializePolygon();
      drawRoiBox(null,null);
      drawNotRoiBox();
    }
  }
}

document.addEventListener("keydown", documentKeyDown)

// 保存ボタン
var save_button = document.getElementById("save-button")

save_button.addEventListener(
  "click",
  (e) => {
    shown_img.src = "static/書き出し中.png"; // 書き出しの値
    setSizeCanvas();
    setSizeCanvasWrapper();
    canvasCrear();
    is_wait_image_chenge = true;
    $.ajax({
      url: "/savealldata",
      type: "POST",
      data: JSON.stringify(all_data_dict),
      dataType: "json",
      contentType: 'application/json'
    })
    .done(function(response) {
      is_wait_image_chenge = false;
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
    canvasCrear();
    frame_index = 0;
    all_data_dict = {};
    initializeRoi();
    initializePolygon();
    $.ajax({
      url:"/removecash",
      type:"POST",
      //data: JSON.stringify({}),
      //dataType: "json",
      //contentType: 'application/json'
    })
  }
)
