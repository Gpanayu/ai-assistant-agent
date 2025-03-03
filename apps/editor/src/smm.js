
var g = new dagreD3.graphlib.Graph()
.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 50 })
.setDefaultEdgeLabel(function () { return {}; });

const nodes = [
  "Restaurant", "Customer",
  "view_menu", "create_order", "clear_order",
  "view_order_summary", "add_to_order", "remove_from_order",
  "calculate_order_cost", "get_receipt", "inventory_helper",
  "cook_time_helper", "restock_inventory", "cook_order",
  "view_inventory", "add_to_queue", "average_cook_time"
];


const descriptions = {
    "Restaurant": "<p>Class for Restraunt</p>",
    "Customer": "<p>Class for Customer</p>",
    "view_menu":  "<p>Prints the menu items and their cost</p><i>String Interpolation, Looping</i>",
    "create_order": "<p>Creates an order with a random 4-digit ID and empty items list</p><i>Random num generation, Object Initiation</i>",
    "clear_order": "<p>Clears all items in the order and resets cost to zero.</p><i>List Operations</i>",
    "view_order_summary": "<p>Displays all items in the order with their cost and the total cost</p><i>Looping, String Interpolation</i>",
    "add_to_order": "<p>Adds an item to the order if it exists in the menu; updates the order cost</p><i>Conditional Statement(If-else), List concepts, String Interpolation</i>",
    "remove_from_order": "TODO",
    "calculate_order_cost": "TODO",
    "get_receipt": "TODO",
    "inventory_helper": "TODO",
    "cook_time_helper": "TODO",
    "restock_inventory": "TODO",
    "cook_order": "TODO",
    "view_inventory": "TODO",
    "add_to_queue": "TODO",
    "average_cook_time": "TODO",
}


nodes.forEach(function (id) {
  g.setNode(id, { label: id, shape: "rect", class: "unchecked" });
});

const links = [
  { source: "Customer", target: "view_menu" },
  { source: "Customer", target: "create_order" },
  { source: "view_menu", target: "clear_order" },
  { source: "view_menu", target: "view_order_summary" },
  { source: "create_order", target: "add_to_order" },
  { source: "create_order", target: "remove_from_order" },
  { source: "add_to_order", target: "calculate_order_cost" },
  { source: "remove_from_order", target: "calculate_order_cost" },
  { source: "calculate_order_cost", target: "get_receipt" },
  { source: "Restaurant", target: "inventory_helper" },
  { source: "Restaurant", target: "cook_time_helper" },
  { source: "inventory_helper", target: "restock_inventory" },
  { source: "inventory_helper", target: "cook_order" },
  { source: "inventory_helper", target: "view_inventory" },
  { source: "view_inventory", target: "add_to_queue" },
  { source: "cook_order", target: "add_to_queue" },
  { source: "average_cook_time", target: "add_to_queue" },
  { source: "cook_time_helper", target: "average_cook_time" }
];


links.forEach(function (link) {
  g.setEdge(link.source, link.target);
});


var render = new dagreD3.render();

var svg = d3.select("svg"),
  svgGroup = svg.append("g");

var zoom = d3.zoom().on("zoom", function (event) {
  svgGroup.attr("transform", event.transform);
});
svg.call(zoom);

render(d3.select("g"), g);


var xCenterOffset = (parseInt(svg.style("width")) - g.graph().width) / 2;
svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
svg.attr("height", g.graph().height + 40);

svgGroup.selectAll(".node").on("click", function (event, nodeId) {
  ws.send(JSON.stringify({ event: "updateNode", payload: { node: nodeId, id: animalId } }))
});

svgGroup.selectAll(".node").on("mouseover", async function (event, nodeId) {
    tippy(this, {
        onHidden(instance) {
            instance.setContent('Loading...');
        },
        onShow(instance) {
            fetch(`https://prime-lab.cs.vt.edu:8000/lookup/${nodeId}`)
                .then(res => res.json())
                .then(data => {
                    console.log(data)
                    instance.setContent(data.html)
                })

        },
        allowHTML: true
    });
});


const animalId = localStorage.getItem("id")
const ws = new WebSocket(`wss://prime-lab.cs.vt.edu:8000/ws/${animalId}`);


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
