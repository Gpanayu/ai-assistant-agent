import {jumpToFunction} from "./main"

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

var zoom = d3.zoom().on("zoom", function (event) {
  svgGroup.attr("transform", event.transform);
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


const backendServer = '127.0.0.1'
// prime-lab.cs.vt.edu
const animalId = localStorage.getItem("id")
const ws = new WebSocket(`wss://${backendServer}:8000/ws/${animalId}`);


ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
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
