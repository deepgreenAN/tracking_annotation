class CanvasVox{
  constructor(canvas, ctx){
    this.canvas = canvas;
    this.ctx = ctx;
    this.upper_left_pos = {"x":0, "y":0};
    this.lowwer_right_pos = {"x":0, "y":0};
    this.is_search_upper_left = true;
    this.pixel_ratio_display_over_true_x = 1.0;
    this.pixel_ratio_display_over_true_y = 1.0;
    this.is_active = true;
    this.text = "1"
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
      this.upper_left_pos = {"x":pos_dict["x1"],"y":pos_dict["y1"]};
      this.lowwer_right_pos = {"x":pos_dict["x2"],"y":pos_dict["y2"]};
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

export {CanvasVox}