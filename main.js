document.addEventListener("DOMContentLoaded", function(){
  console.log("main.js is loaded.");

  var searchBtn = document.querySelector("#search-location");
  var commentBtn = document.querySelector("#comment-btn");
  var showCommentsBtn = document.querySelector("#show-comments");

  var panel = document.querySelector("#panel");
  var latitude, longitude;
  var currentLocation;
  var map;

  // URL to BE:
  var url = 'http://localhost:3000/';
  var herokuURL = "https://fathomless-island-46232.herokuapp.com/"

  /*
    After speaking with Harry Hur, reading the AWS S3 Docs and looking at tutorials
    these are the sources I used within the back and front-end

    http://stackoverflow.com/questions/34407858/how-to-send-a-file-to-nodejs-using-formdata-and-have-node-send-back-a-confirmati

    https://www.linux.com/learn/how-manage-amazon-s3-files-your-server-side-code

    http://www.joshsgman.com/upload-to-and-get-images-from-amazon-s3-with-node-js/
  */

  $("#upload-form").on("submit", function(e){
    e.preventDefault(); //prevent refresh
    var formData = new FormData(this);

    $.ajax({
       type: "POST",
       url: herokuURL + $(this).attr("action"),
       data: formData,
       cache: false,
       contentType: false,
       processData: false,
       success: function(data) {
           console.log("image has been saved: ", data);
       },
       error: function (data) {
           console.error("error: ", data);
       }
   }).done(function(data){
     displayImages(data);
   });
  })

  searchBtn.addEventListener("click", function(){
      //  $(panel).slideDown("slow")
    userInput = document.querySelector("#location-text").value;
    if(userInput != null && userInput && undefined || userInput.length != 0){
        navigator.geolocation.getCurrentPosition(success,error)
    }
  });

  commentBtn.addEventListener("click", function(){
          $("#panel").slideUp("slow");
  });

  showCommentsBtn.addEventListener("click", function(){
    var name = document.querySelector("#restaurant-name").innerText;
    console.log(herokuURL + "restaurants/" + name);
    $.ajax({
      //url: herokuURL + "restaurants/" + name,
      url: url + "restaurants/" + name,
      dataType: 'json'
    }).done(function(data){
        displayComments(JSON.parse(data));
    });

    //animate so the panels move
    $("#comment-panel").slideDown("slow")
  });
  //display map
  function displayMap(response){
    currentLocation =  new google.maps.LatLng(latitude,longitude);
    map = new google.maps.Map(document.getElementById('map'), {
      center: currentLocation,
      zoom: 15
    });
    displayResults(response.results);
  }
  //display the results on the google map from the search parameter
  function displayResults(results) {
    for (var i = 0; i < results.length; i++) {
      createMarker(results[i]);
    }
  }
  //create marker on the google map
  function createMarker(res) {
      var marker = new google.maps.Marker({
        position: res.geometry.location,
        map: map
      })
      infoWindow = new google.maps.InfoWindow({
          content: ""
      });
      google.maps.event.addListener(marker, "click", function(){
        infoWindow.setContent(res.name +  "<button type='button' class='waves-effect waves-light btn' id='comment'>Comment!</button");
        infoWindow.open(map, this);

        document.querySelector("#comment").addEventListener("click", function(){
          var restaurant = {
            name: res.name,
            address: res.vicinity,
            rating: res.rating,
            comments: []
          }
            //populate the panel with data
            var restName = document.querySelector("#restaurant-name");
            var address = document.querySelector("#address");
            var rating = document.querySelector("#rating");
            restName.innerHTML = restaurant.name;
            address.innerHTML = restaurant.address;
            rating.innerHTML = restaurant.rating;

            //clear old comment
            var commentArea = document.querySelector("#comment-area");
            commentArea.value = "";

            //get images to display
            $.ajax({
              url: herokuURL + "restaurants/img",
            //  url: 'http://localhost:3000/restaurants/img',
              dataType: 'json'
            }).done(function(data){
              //console.log(data);
              displayImages(data);
            });

            //animate so the panels move
            $(panel).slideDown("slow")

            //push comment
            var commentBtn = document.querySelector("#comment-btn");

            commentBtn.addEventListener("click", function(){

            restaurant["comments"].push(document.querySelector("#comment-area").value);

            $.ajax({
              url: url + 'restaurants/' + restaurant.name,
              dataType: 'json',
              method: 'put',
              data: restaurant
            }).done(function(response){
              console.log("Put response", response);
            }); // end ajax

            });
        })
      });
    }
  //displays images
  function displayImages(data){
    console.log(data);
    // 1. Initialize fotorama manually.
    var fotorama = document.querySelector(".fotorama");
    fotorama.innerHTML = "";
    for(var i = 0; i < data.urls.length; i++){
      var img = document.createElement("img");
      img.src = data.urls[i];
      fotorama.appendChild(img);
    }
  }
  //displays the comments
  function displayComments(data){
    var commentPanel = document.querySelector("#comment-panel");
    commentPanel.innerHTML = "";
    var h2 = document.createElement("h2");
    h2.innerText = "Comments";
    commentPanel.appendChild(h2);
    var restaurantName;
    for(property in data){
      if(property == "name"){
        restaurantName = data[property];
      }
      if(property == "comments"){
        for(var i = 0; i < data[property].length; i++){
            var commentDiv = document.createElement("div");
            commentDiv.classList.add("comment");
            var p = document.createElement("p");
            var context = document.createTextNode(data[property][i]);
            p.appendChild(context);
            commentDiv.appendChild(p);

            var button = document.createElement("button");
            button.classList.add("waves-effect");
            button.classList.add("waves-light");
            button.classList.add("btn");
            var icon = document.createElement("i");
            icon.classList.add("material-icons");
            icon.innerHTML = "delete";
            button.appendChild(icon);
            commentDiv.appendChild(button);
            commentPanel.appendChild(commentDiv);

            button.addEventListener("click", function(){
              deleteComment(restaurantName,$(this).siblings());
            });


          }
        }
      }
    }

  //deletes the comment
  function deleteComment(restaurantName, comment){
    var commentValue = comment[0].innerText;
    var data = {
          name: restaurantName,
          comment: commentValue
        };
      $.ajax({
        url: url + "restaurants/" + restaurantName,
        dataType: 'json',
        data: data,
        method: 'delete'
      }).done(function(response){
        console.log(commentValue + " has been deleted.");
    }); // end ajax;

  }
  //makes a restaurant search if found location
  function success(pos) {
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;

    //send data BE
    var data = {
      queryString: userInput,
      lat: latitude,
      long: longitude,
      radius: '500'
    };

    $.ajax({
     //url: url + '/restaurant/search',
     url: herokuURL + "restaurant/search",
     method: 'POST',
     data: data,
     dataType: 'json'
   }).done(function(response) {
      displayMap(response);
   }); // end ajax
  }

  //if an error has occured
  function error(){
    var results = document.querySelector(".results");
    var p = document.createElement("p");
    p.innerHTML = "An error has occured.";
    results.appendChild(p);
  }
});
