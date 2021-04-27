tracker_name_select = document.getElementById("tracker-name-select");
make_video_checkbox = document.getElementById("make-video-checkbox");

function postOption() {
  $.ajax({
    url: "/optionsubmit",
    type: "POST",
    data: JSON.stringify({
      "tracker_name":tracker_name_select.value,
      "make_video":make_video_checkbox.checked
    }),
    dataType: "json",
    contentType: "application/json"
  }).done(function(response){
      if (response["is_success"]) {
        alert("オプションを適用しました")
      }
  })
}

option_submit_button = document.getElementById("option-submit-button");
option_submit_button.onclick = (e) => {
  postOption();
}