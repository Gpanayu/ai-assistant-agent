import {jumpToFunction} from "./main"

const backendServer = '127.0.0.1'
// prime-lab.cs.vt.edu
const animalId = localStorage.getItem("id")
const ws = new WebSocket(`wss://${backendServer}:8000/ws/${animalId}`);

let answer = ""
let code = false

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  if (data['event'] === 'notification') {
    const notification = document.querySelector(".notification")
    const title = document.querySelector("#title")
    const context = document.querySelector("#context")
    context.textContent = data["payload"]["context"]
    const progressInitData = data["payload"]["progress"]
    // {'AgitatedViper': {'completed': 2, 'total_assigned': 2}, 'GuiltyWhale': {'completed': 3, 'total_assigned': 3}}
    const totalPossible=30
    let result = {who: "Progress Contributions"}
    for (const user in progressInitData){
      const percentage = ((progressInitData[user].completed / totalPossible) * 100).toFixed(2);
      result[user] = parseFloat(percentage);
    }
    console.log([result])
    updateProgress([result])
    notification.classList += " active"
    console.log(data['payload']['help'])
    if (data['payload']['help'] === "doneNoHelp") {
      code = true
      const helper = document.querySelector("#for-helper")
      helper.style.display = "none"
      title.textContent = "Task Complete!"

      document.querySelector("#options").innerHTML = ""

      for (let option of data["payload"]["options"]) {
        console.log(option)
        const li = document.createElement("li")
        const button = document.createElement("button")
        button.className = "select";
        li.append(button)

        const upperDiv = document.createElement("div")
        upperDiv.style = "display: flex; align-items: center; justify-content: space-between; padding: 0"
        const title = document.createElement("h4")
        title.className = "title"
        title.textContent = option["task_title"]
        upperDiv.append(title)
        button.append(upperDiv)
        button.addEventListener("click", () => {
          document.querySelectorAll("#options button.active").forEach(btn => btn.classList.remove("active"));
          // Optional: if you also want to add 'active' to the clicked one
          button.classList.add("active");
          answer = title.textContent
        })

        const reasoning = document.createElement("p")
        reasoning.textContent = `Reasoning: ${option["reasoning"]}`
        button.append(reasoning)

        const challenge = document.createElement("p")
        challenge.textContent = `Estimated Time: ${option["estimated_time_in_seconds"]} seconds`
        button.append(challenge)

        document.querySelector("#options").append(li)
      }
    }
    else if (data['payload']['help'] === "doneHelp"){
      const helper = document.querySelector("#for-helper")
      helper.style.display = "block"
      title.textContent = "Collaborative Opportunity!"
    }
    else if (data['payload']['help'] === "helpSystem") {
      code = false
      const helper = document.querySelector("#for-helper")
      helper.style.display = "none"
      title.textContent = "Looks like you are stuck! Would you like to ask for help?"
      helper.style.display = "none"

      document.querySelector("#options").innerHTML = ""

      for (let option of data["payload"]["options"]) {
        console.log(option)
        const li = document.createElement("li")
        const button = document.createElement("button")
        button.className = "select";
        li.append(button)

        button.addEventListener("click", () => {
          document.querySelectorAll("#options button.active").forEach(btn => btn.classList.remove("active"));
          // Optional: if you also want to add 'active' to the clicked one
          button.classList.add("active");
          answer = title.textContent
        })

        const upperDiv = document.createElement("div")
        upperDiv.style = "display: flex; align-items: center; justify-content: space-between; padding: 0"
        const title = document.createElement("h4")
        title.className = "title"
        title.textContent = option["task_title"]
        upperDiv.append(title)
        button.append(upperDiv)

        const reasoning = document.createElement("p")
        reasoning.textContent = `Reasoning: ${option["reasoning"]}`
        button.append(reasoning)

        const challenge = document.createElement("p")
        challenge.textContent = `Estimated Time: ${option["estimated_time_in_seconds"]}`
        button.append(challenge)

        document.querySelector("#options").append(li)
      }
    }
  }
  if (data["event"] === "updateGraph") {
    const graph = data["payload"]["graph"]
    console.log(graph)
    svgGroup.selectAll(".node").each(function (node, nodeId) {
      if (graph[node] == 2) {
        console.log("completed", node)
        let select = d3.select(this)
        select.classed("checked2", true);
        select.classed("checked1", false);
      }
      if (graph[node] == 1) {
        let select = d3.select(this)
        select.classed("checked1", true);
        select.classed("checked2", false);
      }
      if (graph[node] == 0) {
        let select = d3.select(this)
        select.classed("checked1", false);
        select.classed("checked2", false);
        select.classed("unchecked", true);
      }
    })
  }
})

document.querySelector('#accept').addEventListener('click', acceptNotif);

function acceptNotif() {

  if (code) {
    jumpToFunction(answer)
    ws.send(JSON.stringify({ event: "updateNode", payload: { node: answer, id: animalId } }))
  }

  document
    .querySelector('#notification')
    .classList.remove('active');
}

var g = new dagreD3.graphlib.Graph()
.setGraph({ rankdir: "TB"})
.setDefaultEdgeLabel(function () { return {}; });

const nodes = [
  "Restaurant", "Customer",
  "view_menu", "create_order", "clear_order",
  "view_order_summary", "add_to_order", "remove_from_order",
  "calculate_order_cost", "get_receipt", "inventory_helper",
  "cook_time_helper", "restock_inventory", "cook_order",
  "add_to_queue", "average_cook_time"
];

nodes.forEach(function (id) {
  g.setNode(id, { label: id, shape: "rect", class: "unchecked" });
});

const links = [
  { source: "Customer", target: "view_menu" },
  { source: "Customer", target: "create_order" },
  { source: "Restaurant", target: "inventory_helper" },
  { source: "Restaurant", target: "restock_inventory" },
  { source: "Restaurant", target: "cook_time_helper" },
  { source: "create_order", target: "view_order_summary" },
  { source: "create_order", target: "calculate_order_cost" },
  { source: "create_order", target: "clear_order" },
  { source: "create_order", target: "add_to_queue" },
  { source: "view_order_summary", target: "get_receipt" },
  { source: "calculate_order_cost", target: "add_to_order" },
  { source: "calculate_order_cost", target: "remove_from_order" },
  { source: "inventory_helper", target: "cook_order" },
  { source: "inventory_helper", target: "hiddenNode", style: "visibility: hidden" },
  { source: "hiddenNode", target: "cook_order", style: "visibility: hidden" },
  { source: "cook_time_helper", target: "cook_order" },
  { source: "add_to_queue", target: "cook_order" },
  { source: "cook_time_helper", target: "hiddenNode", style: "visibility: hidden" },
  { source: "cook_time_helper", target: "average_cook_time" },
];

// Add dummy node to force rank alignment
g.setNode("sameRank", {label:"", rank: 0, width: 0, height: 0, style: "visibility: hidden" });

g.setNode("hiddenNode", {label:"", rank: 0, width: 0, height: 0, style: "visibility: hidden" });


// Add edges to enforce same rank
g.setEdge("sameRank", "Customer", { style: "visibility: hidden" });
g.setEdge("sameRank", "Restaurant", { style: "visibility: hidden" });

links.forEach(function (link) {
  g.setEdge(link.source, link.target, {curve: d3.curveBasis, style: link.style});
});

g.nodes().forEach(function(v) {
  var node = g.node(v);
  node.rx = node.ry = 5;
});

var render = new dagreD3.render();

var svg = d3.select("svg"),
  svgGroup = svg.append("g");

var zoom = d3.zoom().on("zoom", function (e) {
  svgGroup.attr("transform", e.transform);
});
svg.call(zoom);

render(d3.select("g"), g);

const graphWidth = g.graph().width;
const graphHeight = g.graph().height;
const svgWidth = parseInt(svg.style("width").replace("px", ""));
const svgHeight = parseInt(svg.style("height").replace("px", ""));

const scale = Math.min(svgWidth / graphWidth, svgHeight / graphHeight) * 0.9;

const translateX = (svgWidth - graphWidth * scale) / 2;
const translateY = (svgHeight - graphHeight * scale) / 2;

svg.transition().duration(500).call(
  zoom.transform,
  d3.zoomIdentity.translate(translateX, translateY).scale(scale)
);

svgGroup.selectAll(".node").on("click", function (event, nodeId) {
  jumpToFunction(nodeId)
  ws.send(JSON.stringify({ event: "updateNode", payload: { node: nodeId, id: animalId } }))
});

svgGroup.selectAll(".node").on("mouseover", async function (event, nodeId) {
    tippy(this, {
        onHidden(instance) {
            instance.setContent('Loading...');
        },
        onShow(instance) {
            fetch(`https://${backendServer}:8000/lookup/${nodeId}`)
                .then(res => res.json())
                .then(data => {
                    instance.setContent(data.html)
                })

        },
        allowHTML: true
    });
});


// set the dimensions and margins of the graph
var margin = {top: 30, right: 0, bottom: 70, left: 200},
    width = 480 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

// Append the SVG object to the body of the page
var svg3 = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// A function that creates/updates the stacked bar chart
async function updatePrediction(data) {
    let value = data[0].prediction
    let completed = data[0].completed

    // Clear existing elements
    svg3.selectAll("*").remove();

    // Initialize the Y axis (now categorical)
    let y = d3.scaleBand()
        .range([0, height])
        .padding(0.2);
    let yAxis = svg3.append("g");

    // Initialize the X axis (now linear)
    let x = d3.scaleLinear()
        .range([0, width - margin.right])
    let xAxis = svg3.append("g")
        .attr("transform", "translate(0," + height + ")")


    let brush = d3.brushX().extent([[0, height - y.bandwidth() - 4], [width, y.bandwidth() + 4]])
        .on("brush", brushed)
        .on("end", brushEnded);

    function brushed(event) {
        if (!event.selection) return; // Ignore if no selection
        let [x0, x1] = event.selection.map(x.invert); // Convert pixel to data
        value = x1;
        if (x0 !== 0) {
            d3.select(this).call(brush.move, [0, x1]);
        }
        else if (x1 < completed) {
            return
        }
        svg3.select(".myPredictionValue text")
            .attr('x', x(value + 5))
            .text(d3.format('.0f')(value) + "%");
    }

    function brushEnded(event) {
        if (!event.selection) {
            d3.select(this).call(brush.move, [x(0), x(value)]); // Reset brush
        }
    }

    // Extract subgroups (keys other than 'who')
    const subgroups = Object.keys(data[0]).filter(k => k !== "who");

    // Color scale
    var color = d3.scaleOrdinal().domain(subgroups).range([d3.color("grey").copy({opacity: 0.5}), d3.color("steelblue")]);

    // Update Y axis (categorical)
    y.domain(data.map(d => d.who));
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Update X axis (linear)
    x.domain([0, 100]);
    xAxis.transition().duration(1000).call(d3.axisBottom(x).tickValues(d3.range(0, 101, 25)));

    svg3.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, function (d){
        return [0, value].map(x);
    })


    svg3.append("g")
        .attr("fill", d3.color("steelblue"))
        .selectAll()
        .data(data)
        .join("rect")
        .attr("y", d => y(d.who))
        .attr("x", x(0)) // Start bars from zero
        .attr("width", x(0)) // Initially zero width
        .attr("height", y.bandwidth())
        .transition().duration(1000)
        .attr("x", d => x(0)) // Position based on stack start
        .attr("width", d => x(d.completed) - x(0))


    svg3.append("g")
        .attr("class", "myPredictionValue")
        .append("text")
        .attr('x', x(value + 5))
        .attr('y', y.bandwidth() - 10)
        .style('fill', 'black')
        .text(function (d) {return value + "%"})


    svg3.selectAll("mydots")
        .data(subgroups)
        .enter()
        .append("circle")
        .attr("cx", 206)
        .attr("cy", function(d,i){ return 150 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("r", 7)
        .style("fill", function(d){ return color(d)})

    // Add one dot in the legend for each name.
    svg3.selectAll("mylabels")
        .data(subgroups)
        .enter()
        .append("text")
        .attr("x", 220)
        .attr("y", function(d,i){ return 153.5 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function(d){ return color(d)})
        .text(function(d){ return d})
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
}

// Append the SVG object to the body of the page
var svg2 = d3.select("#my_dataviz2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

async function updateProgress(data) {
    // Initialize the Y axis (now categorical)
    let y = d3.scaleBand()
        .range([0, height])
        .padding(0.2);
    let yAxis = svg2.append("g");

    // Initialize the X axis (now linear)
    let x = d3.scaleLinear()
        .range([0, width - margin.right])
    let xAxis = svg2.append("g")
        .attr("transform", "translate(0," + height + ")")

    // Extract subgroups (keys other than 'who')
    const subgroups = Object.keys(data[0]).filter(k => k !== "who");

    // Color scale
    let color = d3.scaleOrdinal().domain(subgroups).range(d3.schemeSet2);

    // Update Y axis (categorical)
    y.domain(data.map(d => d.who));
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Stack the data
    var stackedData = d3.stack().keys(subgroups)(data);

    // Update X axis (linear)
    x.domain([0, 100]);
    xAxis.transition().duration(1000).call(d3.axisBottom(x).tickValues(d3.range(0, 101, 25)));

// Bind data to groups
    var groups = svg2.selectAll(".barGroup")
        .data(stackedData);

    // Enter + Update groups
    groups.enter()
        .append("g")
        .attr("class", "barGroup")
        .merge(groups)
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("y", d => y(d.data.who))
        .attr("x", x(0)) // Start bars from zero
        .attr("width", d => x(0) - x(0)) // Initially zero width
        .attr("height", y.bandwidth())
        .transition().duration(1000)
        .attr("x", d => x(d[0])) // Position based on stack start
        .attr("width", d => x(d[1]) - x(d[0])); // Width is the difference


    svg2.selectAll("mydots")
        .data(subgroups)
        .enter()
        .append("circle")
        .attr("cx", 206)
        .attr("cy", function(d,i){ return 150 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("r", 7)
        .style("fill", function(d){ return color(d)})

    // Add one dot in the legend for each name.
    svg2.selectAll("mylabels")
        .data(subgroups)
        .enter()
        .append("text")
        .attr("x", 220)
        .attr("y", function(d,i){ return 153.5 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function(d){ return color(d)})
        .text(function(d){ return d})
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
}

// Initialize plot
updatePrediction([
    {who: "End Goal Completion %", prediction: 80, completed: 20, },
])

updateProgress([
    {who: "Progress Contributions", a: 0, b: 0, c: 0 },
])


const sliderEl = document.querySelector("#rangeSlider")
const sliderValue = document.querySelector("#rangeValue")
const spanValue = document.querySelector("#timeSpent")

if (sliderEl) {
  let timeout;
  sliderEl.addEventListener("input", (event) => {
    const tempSliderValue = event.target
    sliderValue.textContent = `${tempSliderValue.value} minutes`;
    spanValue.textContent = sliderValue.textContent


    clearTimeout(timeout)

    if (+tempSliderValue.value === 0) {
      const feedback = document.querySelector("#feedback")
      const options = document.querySelector("#options")
      feedback.style.display = "none";
      options.style.display = "block";
      timeout = setTimeout(() => {
        updatePrediction([
          {who: "End Goal Completion %", prediction: 40, completed: 20, },
        ])
      }, 1000)
    }
    else {
      const feedback = document.querySelector("#feedback")
      const options = document.querySelector("#options")
      feedback.style.display = "block";
      options.style.display = "none";
      timeout = setTimeout(() => {
        updatePrediction([
          {who: "End Goal Completion %", prediction: 80, completed: 20, },
        ])
      }, 1000)

    }

    const progress = (parseInt(tempSliderValue.value) / parseInt(sliderEl.max)) * 100

    sliderEl.style.background = `linear-gradient(to right, lightblue ${progress}%, #ccc ${progress}%)`;

    const left = (((+sliderEl.value - +sliderEl.min) / (+sliderEl.max - +sliderEl.min)) * ((sliderValue.clientWidth - 8) - 8)) + 4;
    sliderValue.style.left = `calc(${left}px - 30px)`;

  })

}

function selectMe() {
  console.log(this)
}
