const svg = d3.select("#viz");
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = { top: 80, right: 80, bottom: 80, left: 80 };

let data;
let currentScene = 0;
const scenes = [drawScene0, drawScene1, drawScene2];

d3.csv("asian_vs_western_car_sales.csv", d3.autoType)
  .then(raw => {
    data = raw;
    initControls();
    render();
  })
  .catch(err => console.error("CSV load error:", err));

function initControls() {
  d3.select("#next").on("click", () => {
    currentScene = Math.min(currentScene + 1, scenes.length - 1);
    updateUI(); render();
  });
  d3.select("#prev").on("click", () => {
    currentScene = Math.max(currentScene - 1, 0);
    updateUI(); render();
  });
  d3.select("#scene-select").on("change", function() {
    currentScene = +this.value;
    render();
  });
}
function updateUI() {
  d3.select("#scene-select").property("value", currentScene);
}

function render() {
  svg.selectAll("*").remove();
  scenes[currentScene]();
}

// Scene 0 

function drawScene0() {
  const nested = d3.rollups(data, v => d3.sum(v, d => d.sales), d => d.year, d => d.brand_origin);
  const flat = [];
  nested.forEach(([year, origins]) => {
    origins.forEach(([origin, sales]) => flat.push({ year, origin, sales }));
  });

  const x = d3.scaleLinear().domain(d3.extent(flat, d => d.year)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([d3.min(flat, d => d.sales) * 0.95, d3.max(flat, d => d.sales)]).range([height - margin.bottom, margin.top]);
  const color = d3.scaleOrdinal().domain(["Asian", "Western"]).range(["#e41a1c", "#377eb8"]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.year)).y(d => y(d.sales));

  ["Asian", "Western"].forEach(origin => {
    const series = flat.filter(d => d.origin === origin).sort((a, b) => a.year - b.year);
    svg.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", color(origin))
      .attr("stroke-width", 2.5)
      .attr("d", line);
  });

  svg.append("text").attr("x", width / 2).attr("y", 40).attr("text-anchor", "middle").attr("font-size", "20px").text("Total Sales by Year: Asian vs Western");

  svg.append("rect")
    .attr("x", width / 2 - 180)
    .attr("y", 55)
    .attr("width", 360)
    .attr("height", 30)
    .attr("fill", "white")
    .attr("opacity", 0.8);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 75)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Western brands overtook Asian brands around 2016");

  drawLegend(svg, color, ["Asian", "Western"]);
}

// Scene 1
function drawScene1() {
  const nested = d3.rollups(data, v => d3.sum(v, d => d.sales), d => d.year, d => d.brand_origin);
  const byYear = [];
  nested.forEach(([year, groups]) => {
    const row = { year };
    let total = d3.sum(groups, g => g[1]);
    groups.forEach(([origin, sales]) => {
      row[origin] = sales / total;
    });
    byYear.push(row);
  });

  const stack = d3.stack().keys(["Asian", "Western"]);
  const series = stack(byYear);

  const x = d3.scaleLinear().domain(d3.extent(byYear, d => d.year)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);
  const color = d3.scaleOrdinal().domain(["Asian", "Western"]).range(["#e41a1c", "#377eb8"]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  svg.selectAll(".area")
    .data(series)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
    );

  svg.append("text").attr("x", width / 2).attr("y", 40).attr("text-anchor", "middle").attr("font-size", "20px").text("Market Share by Region Over Time");

  svg.append("rect")
    .attr("x", width / 2 - 180)
    .attr("y", 55)
    .attr("width", 360)
    .attr("height", 30)
    .attr("fill", "white")
    .attr("opacity", 0.8);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 75)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Asian brands dominated early years, Western rising since 2010");

  drawLegend(svg, color, ["Asian", "Western"]);
}

// Scene 2
function drawScene2() {
  const latest = d3.max(data, d => d.year);
  const latestData = data.filter(d => d.year === latest);

  const brandTotals = d3.rollups(latestData, v => ({
    sales: d3.sum(v, d => d.sales),
    origin: v[0].brand_origin
  }), d => d.brand)
    .map(([brand, { sales, origin }]) => ({ brand, sales, origin }))
    .sort((a, b) => d3.descending(a.sales, b.sales))
    .slice(0, 10); 

  const x = d3.scaleBand()
    .domain(brandTotals.map(d => d.brand))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(brandTotals, d => d.sales)]).nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(["Asian", "Western"])
    .range(["#e41a1c", "#377eb8"]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format(",.0f")));

  svg.selectAll("rect")
    .data(brandTotals)
    .enter()
    .append("rect")
    .attr("x", d => x(d.brand))
    .attr("y", d => y(d.sales))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.sales))
    .attr("fill", d => color(d.origin));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .text(`Top 10 Brands by Sales in ${latest}`);

  svg.append("rect")
    .attr("x", width / 2 - 200)
    .attr("y", 55)
    .attr("width", 400)
    .attr("height", 30)
    .attr("fill", "white")
    .attr("opacity", 0.8);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 75)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Asian brands lead in top 10, with Toyota and Hyundai dominating");

  drawLegend(svg, color, ["Asian", "Western"]);
}

// Legend Function 
function drawLegend(svg, colorScale, keys) {
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

  keys.forEach((key, i) => {
    const group = legend.append("g").attr("transform", `translate(0, ${i * 20})`);

    group.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colorScale(key));

    group.append("text")
      .attr("x", 16)
      .attr("y", 10)
      .text(key)
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });
}
