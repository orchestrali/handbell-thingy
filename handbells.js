//holder for svg functions
var grid;

//var for receiving methods from json file
var methods = [];

//stage
var stage = 8;
//pn
var pn;
//placeholder starting row array
var rowArr = [[1,2,3,4,5,6,7,8]];

//pair(s) to draw on the grid
//each object has keys: pair, arr, pos, side
//side refers to order within the pair
var pairs = [{pair: [1,2]}];

//paths or lines
var what = "paths";
//space between dots in the grid
var gap = 40;

//vars for method search
var method;
var methodlist = [];
var searchvalue = "";
var matchmethods = [];

var running = false;
var paused = false;
//current row of rowArr
var row = 0;

$(function() {

  getmethods();
  $("#container").svg({onLoad: (o) => {
    grid = o;
    grid.configure({xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", width: 600, height: 600, id: "gridcontainer"});
    drawgrid(stage);
    drawpairs();
  }});
  $("#go").on("click", start);
  $("#reset").on("click", () => {
    if (!$(this).hasClass("disabled")) {
      reset();
    }
  });

  $('input[name="what"]').on("click", changewhat);
  $('input[type="checkbox"]').on("click", changepairs);

  $("#methodtitle").on("click", methodsearch);
  $("#methodtitle").on("keyup", methodsearch);
  $("#methodlist").on("click", "li", (e) => {
    $("#methodtitle").val($(e.currentTarget).text());
    $("#methodlist li").hide();
    $("#choosemethod").removeClass("disabled");
    e.stopPropagation();
  });
  $("#choosemethod").on("click", choosemethod);
});

function getmethods() {
  //get stuff from file(s)
  $.get("methods.json", function(data) {
    methods = data;
    //console.log(methods.length);
  });
}

function start() {
  if (!running) {
    $("input").prop("disabled", true);
    running = true;
    animate();
  }
}

//set up dot grid
function drawgrid(n) {
  $("#gridcontainer").children().remove();
  let group = grid.group("grid", {fill: "black", stroke: "none"});
  for (let a = 1; a < n; a++) {
    for (let b = a+1; b <= n; b++) {
      grid.circle(group, a*gap+10, b*gap+10, 3);
      grid.circle(group, b*gap+10, a*gap+10, 3);
    }
  }

  grid.group("bells", {fill: "none", stroke: "blue", "stroke-width": 2});
  
}

//draw starting position and attach array of positions to the pairs
function drawpairs() {
  let bells = $("#bells");
  let path = [];
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i];
    pair.arr = buildarr(...pair.pair);
    pair.pos = [pair.pair[1]*gap+10, pair.pair[0]*gap+10];
    path.push(pair.pos);
    if (path.length === 2 && what === "lines") {
      grid.line(bells, path[0][0], path[0][1], path[1][0], path[1][1], {id: "line"+i});
      path = [pair.pos];
    }
    pair.side = 1;
    grid.circle(bells, pair.pos[0], pair.pos[1], 6, {id: "pair"+i});
  }
}

//given two bells, build array of their places in each row
function buildarr(a,b) {
  let arr = [];
  rowArr.forEach(row => {
    let r = [row.indexOf(a)+1, row.indexOf(b)+1];
    arr.push(r);
  });
  return arr;
}

function changewhat() {
  what = $('input[name="what"]:checked').val();
  if (what === "paths") {
    $("line").remove();
  } else {
    $("#bells").children().remove();
    drawpairs();
  }
}

//change which pairs to draw
function changepairs() {
  pairs = [];
  $('input[type="checkbox"]').each((i,e) => {
    if ($(e).prop("checked") && !$(e).prop("disabled")) {
      let n = Number($(e).val());
      pairs.push({pair: [n,n+1]});
    }
  });
  $("#bells").children().remove();
  drawpairs();
}

//reset to beginning of method
function reset() {
  $("#bells").children().remove();
  drawpairs();
  row = 0;
  $("#reset").addClass("disabled");
}

function animate() {
  if (rowArr[row+1] && !paused) {
    let line = [];
    for (let p = 0; p < pairs.length; p++) {
      let o = pairs[p];
      let arr = o.arr;
      let pos = o.pos;
      let path = "M "+pos.join(" ");
      let zero;
      if (arr[row+1][0] === arr[row][1] && arr[row+1][1] === arr[row][0]) {
        //if the bells trade places
        pos.reverse();
        side *= -1;
      } else {
        //i is 0, j is 1; then swap
        //did I make it so x is the 2nd bell and y is the first??
        let j = 1;
        for (let i = 0; i <= 1; i++) {
          let d = arr[row+1][i] - arr[row][i];
          if (d === 0) zero = true;
          pos[j] += 40*d;
          j--;
        }
      }
      path += " L "+pos.join(" ");
      line.push(pos);
      if (line.length === 2 && what === "lines") {
        $("#line"+p).animate({"svg-x1": line[0][0], "svg-y1": line[0][1], "svg-x2": line[1][0], "svg-y2": line[1][1]}, 500, "swing");
        line = [pos];
      }
      let obj = {class: "bellpath"};
      if (zero) { //one bell didn't move
        obj["stroke-dasharray"] = 40;
        obj["stroke-dashoffset"] = 40;
      }
      if (what === "paths") {
        grid.path($("#bells"), path, obj);
      }

      if (p === pairs.length-1) {
        //$("#line").animate({points: line}, 500, "swing");
        //next row, repeat this function when the animation finishes
        row++;
        $("#pair"+p).animate({cx: pos[0], cy: pos[1]}, 500, "swing", animate);
      } else {
        //animate the circle of the pair
        $("#pair"+p).animate({cx: pos[0], cy: pos[1]}, 500, "swing");
      }
    }
  } else {
    $("#reset").removeClass("disabled");
    if (row === rowArr.length-1) {
      running = false;
      $("input").prop("disabled", false);
    }
  }
}

function choosemethod() {
  if (!$("#choosemethod").hasClass("disabled")) {
    let m = methods.find(o => o.name === $("#methodtitle").val());
    if (m) {
      method = m;
      pn = m.plainPN;
      let prev = stage;
      stage = m.stage;
      if (stage != prev) stagechange();
      buildrows();
      $("#bells").children().remove();
      drawpairs();
      $("#go").removeClass("disabled");
    }
  }
}

function stagechange() {
  for (let i = 0; i < 6; i++) {
    let n = i*2+1;
    $("#pair"+n).prop("disabled", n > stage);
  }

}

//build plain course from place notation
function buildrows() {
  rowArr = [[1,2,3,4,5,6]];
  if (stage > 6) {
    for (let i = 7; i <= stage; i++) {
      rowArr[0].push(i);
    }
  }
  let prevrow = rowArr[0];
  
  do {
    for (let i = 0; i < pn.length; i++) {
      let row = [];
      let dir = 1;
      let change = pn[i];
      for (let p = 0; p < 8; p++) {
        if (change.includes(p+1)) {
          row.push(prevrow[p]);
        } else {
          row.push(prevrow[p+dir]);
          dir *= -1;
        }
      }
      rowArr.push(row);
      prevrow = row;
    }
  } while (!rowArr[rowArr.length-1].every((n,i) => n === i+1));
}


function methodsearch(e) {
  
  $(document.body).on("click.menuHide", () => {
    $("#methodlist li").hide();
    $(this).off("click.menuHide");
  });
  
  let value = $(this).val().toLowerCase();
  //console.log(value);
  
  if (/^[^\s]/.test(value)) {
    if (searchvalue.length && value.slice(0,-1) === searchvalue) {
      let i = 0;
      do {
        if (methodlist[i].toLowerCase().indexOf(value) === -1) {
          $("#methodlist li:nth-child("+(i+1)+")").remove();
          methodlist.splice(i,1);
        } else {
          i++;
        }
      } while (i < methodlist.length);
      
      matchmethods = matchmethods.filter(m => m.toLowerCase().includes(value));
    } else if (searchvalue.length && searchvalue.slice(0,-1) === value) {
      for (let i = 0; i < methods.length; i++) {
        let title = methods[i].name;
        if (title.toLowerCase().includes(value) && !matchmethods.includes(title) && !methodlist.includes(title)) {
          matchmethods.push(title);
        }
      }
    } else if (searchvalue.length === 0 || (value.length === 1 && searchvalue.length > 1)) {
      $("#methodlist li").remove();
      methodlist = [];
      matchmethods = [];
      for (let i = 0; i < methods.length; i++) {
        if (methods[i].name.toLowerCase().includes(value)) {
          matchmethods.push(methods[i].name);
        }
      }
    }
    if (methodlist.length < 16 && matchmethods.length) {
      let i = methodlist.length;
      do {
        let j = Math.floor(Math.random() * matchmethods.length);
        methodlist.push(matchmethods[j]);
        $("#methodlist").append("<li>"+matchmethods[j]+"</li>");
        matchmethods.splice(j,1);
        i++;
      } while (matchmethods.length && i <= 16);
    }
    $("#methodlist li").show();
    if (methodlist.length > 1 && !$("#choosemethod").hasClass("disabled")) $("#choosemethod").addClass("disabled");
    searchvalue = value;
    
  } else if (value.length === 0) {
    $("#methodlist li").remove();
    searchvalue = "";
    methodlist = [];
    matchmethods = [];
  }
}

