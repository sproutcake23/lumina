
document.getElementById("nnForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const inputNeurons = parseInt(document.getElementById("inputNeurons").value);
  const hiddenLayers = document.getElementById("hiddenLayers").value
    .split(",")
    .map(Number)
    .filter(n => !isNaN(n) && n > 0);
  const outputNeurons = parseInt(document.getElementById("outputNeurons").value);

  const layers = [inputNeurons, ...hiddenLayers, outputNeurons];

  drawNetwork(layers);
});

document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const svg = document.getElementById("nnCanvas");
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "neural_network.svg";
  a.click();
  URL.revokeObjectURL(url);
});

function drawNetwork(layers) {
  const svg = document.getElementById("nnCanvas");
  svg.innerHTML = "";
 
  const width = svg.clientWidth;
  const height = svg.clientHeight;
  const layerSpacing = width / (layers.length + 1);
  const radius = 20;

  const positions = [];

  // Step 1: Calculate positions
  layers.forEach((neuronCount, layerIndex) => {
    const neurons = [];
    const ySpacing = height / (neuronCount + 1);
    for (let i = 0; i < neuronCount; i++) {
      const cx = (layerIndex + 1) * layerSpacing;
      const cy = (i + 1) * ySpacing;
      neurons.push({ cx, cy });
    }
    positions.push(neurons);
  });

  // Step 2: Draw lines between layers
  for (let i = 0; i < positions.length - 1; i++) {
    const fromLayer = positions[i];
    const toLayer = positions[i + 1];

    fromLayer.forEach(from => {
      toLayer.forEach(to => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", from.cx);
        line.setAttribute("y1", from.cy);
        line.setAttribute("x2", to.cx);
        line.setAttribute("y2", to.cy);
        svg.appendChild(line);
      });
    });
  }

  // Step 3: Draw neurons and labels
  layers.forEach((neuronCount, layerIndex) => {
    const ySpacing = height / (neuronCount + 1);
    for (let i = 0; i < neuronCount; i++) {
      const cx = (layerIndex + 1) * layerSpacing;
      const cy = (i + 1) * ySpacing;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", "var(--primary)");
      circle.setAttribute("stroke", "var(--stroke)");
      circle.setAttribute("stroke-width", "2");
      svg.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", cx);
      text.setAttribute("y", cy + 4);
      text.setAttribute("text-anchor", "middle");

      let label = "";
      if (layerIndex === 0) label = `In${i + 1}`;
      else if (layerIndex === layers.length - 1) label = `Out${i + 1}`;
      else label = `H${layerIndex}-${i + 1}`;
      text.textContent = label;
      svg.appendChild(text);
    }
  });
}
