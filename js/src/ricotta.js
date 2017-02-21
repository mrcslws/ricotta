import * as d3 from "d3";
import * as d3ScaleChromatic from "d3-scale-chromatic";

// Use a single color scale for every diagram.
var globalColor = null;

function insertDiagram2(element, csvText, pixelsPerUnit, sortOrders, colorMapping) {

  let color;

  if (colorMapping) {
    let ks = [],
        vs = [];

    for (let k in colorMapping) {
      ks.push(k);
      vs.push(colorMapping[k]);
    }

    color = d3.scaleOrdinal()
      .domain(ks)
      .range(vs);
  } else {
    if (globalColor == null) {
      globalColor = d3.scaleOrdinal(d3ScaleChromatic.schemeDark2)
        .domain(d3.range(8));
    }

    color = globalColor;
  }

  var svg = d3.select(element).append("svg"),
  container = svg.append("g").attr("transform", "translate(0, 5)"),
  verticalPadding = 8;

  var x = d3.scaleLinear()
    .domain([0, 1])
    .range([0, 120]);

  var y = d3.scaleLinear()
    .domain([0, 1])
    .range([0, pixelsPerUnit]);

  var sequences = d3.csvParseRows(csvText);

  var allLinksExample = [
    // Stage 1 -> 2
    [{source: "high, flat", target: "low, flat", value: 10 },
     {source: "high, flat", target: "low, gliss.asc", value: 10 }],
    // Stage 2 -> 3
    []
  ];

  var allLinks = [];

  sequences.forEach(syllables => {
    while (allLinks.length < syllables.length) {
      allLinks.push([]);
    }

    syllables.forEach((syllable, elementNumber) => {
      var nextSyllable = (elementNumber + 1 < syllables.length)
        ? syllables[elementNumber + 1]
        : "End";

      if (elementNumber == syllables.length - 1) return;

      var links = allLinks[elementNumber];
      var index = links.findIndex(link => {
        return link.source == syllable && link.target == nextSyllable;
      });

      if (index != -1) {
        links[index].value++;
      } else {
        links.push({
          source: syllable,
          target: nextSyllable,
          value: 1
        });
      }
    });
  });

  var allNodesExample = [
    // Stage 1
    [{id: "high, flat"},
     {id: "high, gliss.asc"}],
    // Stage 2
    [{id: "low, flat"},
     {id: "low, gliss.desc"}],
    // Stage 3
    [{id: "high, flat"},
     {id: "high, gliss.asc"}],
  ];

  var allNodes = [];
  for (var i = 0; i < allLinks.length + 1; i++) {
    allNodes.push([]);
  }

  allLinks.forEach((links, linkPosition) => {
    var sourceCounts = {},
    targetCounts = {};

    links.forEach(link => {
      if (link.source in sourceCounts) {
        sourceCounts[link.source] += link.value;
      } else {
        sourceCounts[link.source] = link.value;
      }

      if (link.target in targetCounts) {
        targetCounts[link.target] += link.value;
      } else {
        targetCounts[link.target] = link.value;
      }
    });

    for (let source in sourceCounts) {
      let sourceNodes = allNodes[linkPosition];
      let index = sourceNodes.findIndex(node => node.id == source);
      if (index != -1) {
        sourceNodes[index].count = Math.max(sourceNodes[index].count,
                                            sourceCounts[source]);
      } else {
        sourceNodes.push({
          id: source,
          count: sourceCounts[source]
        });
      }
    }

    for (let target in targetCounts) {
      let targetNodes = allNodes[linkPosition + 1];
      let index = targetNodes.findIndex(node => node.id == target);
      if (index != -1) {
        targetNodes[index].count = Math.max(targetNodes[index].count,
                                            targetCounts[target]);
      } else {
        targetNodes.push({
          id: target,
          count: targetCounts[target]
        });
      }
    }
  });

  // Hack: handle sequences that are length 1 and hence have no links.
  sequences.forEach(syllables => {
    if (syllables.length == 1) {
      let syllable = syllables[0];

      let index = allNodes[0].findIndex(node => node.id == syllable);
      if (index != -1) {
        allNodes[0][index].count++;
      } else {
        allNodes[0].push({
          id: syllable,
          count: 1
        });
      }
    }
  });

  if (sortOrders) {
    allNodes.forEach((nodes, i) => {
      const order = sortOrders[i % sortOrders.length];
      nodes.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
    });
  }

  var verticalSpace = 0;
  var horizontalSpace = x(allLinks.length);


  allNodes.forEach((nodes, sequencePosition) => {
    nodes.forEach((node, nodeNumber) => {
      node.y = (nodeNumber > 0) ?
        nodes[nodeNumber-1].y + nodes[nodeNumber-1].dy + verticalPadding :
        0;
      node.dy = y(node.count);

      verticalSpace = Math.max(verticalSpace, node.y + node.dy);
    });
  });


  // Add sourceObject and targetObject for each link.
  allLinks.forEach((links, linkPosition) => {
    links.forEach(link => {
      link.sourceObject = allNodes[linkPosition].find(d => d.id == link.source);
      link.targetObject = allNodes[linkPosition+1].find(d => d.id == link.target);
      link.dy = y(link.value);
    });

    // The ordering of the links themselves doesn't matter. It's their positions
    // on the source and target objects that matter. So there are two
    // orderings. Sort them one way, compute the source coordinates, sort them
    // the other way, and compute the target coordinates.

    links.sort((a, b) => {
      let ret;
      const primary =
            allNodes[linkPosition].indexOf(a.sourceObject) -
            allNodes[linkPosition].indexOf(b.sourceObject);
      if (primary == 0) {
        ret =
          allNodes[linkPosition+1].indexOf(a.targetObject) -
          allNodes[linkPosition+1].indexOf(b.targetObject);
      } else {
        ret = primary;
      }

      return ret;
    });


    var prevSource = null;
    var prevLink = null;

    links.forEach(link => {
      if (prevSource == null || link.source != prevSource) {
        prevSource = link.source;

        link.sourceObject = allNodes[linkPosition].find(d => d.id == link.source);
        link.sy = 0;
      } else {
        link.sourceObject = prevLink.sourceObject;
        link.sy = prevLink.sy + prevLink.dy;
      }

      prevLink = link;
    });

    links.sort((a, b) => {
      let ret;
      const primary =
            allNodes[linkPosition+1].indexOf(a.targetObject) -
            allNodes[linkPosition+1].indexOf(b.targetObject);
      if (primary == 0) {
        ret =
          allNodes[linkPosition].indexOf(a.sourceObject) -
          allNodes[linkPosition].indexOf(b.sourceObject);
      } else {
        ret = primary;
      }

      return ret;
    });

    var prevTarget = null;
    prevLink = null;

    links.forEach(link => {
      if (prevTarget == null || link.target != prevTarget) {
        prevTarget = link.target;

        link.targetObject = allNodes[linkPosition+1].find(d => d.id == link.target);
        link.ty = 0;
      } else {
        link.targetObject = prevLink.targetObject;
        link.ty = prevLink.ty + prevLink.dy;
      }

      prevLink = link;
    });
  });

  svg
    .attr("width", horizontalSpace)
    .attr("height", verticalSpace + 10);

  var node = container.selectAll(".sequencePosition")
    .data(allNodes)
    .enter()
      .append("g")
      .attr("class", "sequencePosition")
      .attr("transform", (d, i) => "translate(" + x(i) + ",0)")
    .selectAll(".element")
    .data(d => d)
    .enter()
      .append("g")
      .attr("class", "node")
    .attr("transform", d => "translate(0," + d.y + ")");

  var nodeWidth = 15;

  node.append("rect")
    .attr("height", d => d.dy)
    .attr("width", nodeWidth)
    .attr("fill", function(d) { return d.color = color(d.id); })
    .attr("stroke", function(d) { return d3.rgb(d.color).darker(2); })
    .append("title")
    .text(d => `${d.id}: ${d.count}`);

  node.append("text")
    .attr("x", -6)
    .attr("y", function(d) { return d.dy / 2; })
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function(d) { return d.id; })
  // .filter(function(d) { return d.x < width / 2; })
    .attr("x", 6 + nodeWidth)
    .attr("text-anchor", "start");

  var linkGroup = container.append("g").selectAll(".linkGroup")
      .data(allLinks);

  linkGroup = linkGroup.enter()
    .append("g")
      .attr("class", "linkGroup")
      .attr("transform", (d, i) => "translate(" + (x(i) + nodeWidth) + ",0)")
    .merge(linkGroup);

  var link = linkGroup
      .selectAll(".link")
      .data(d => d);

  link = link
    .enter()
    .append("path")
    .attr("class", "link")
    .call(entering => {
      entering.append("title");
    })
    .merge(link);

  link.attr("fill", d => color(d.source))
        // .attr("stroke", d => color(d.source))
        .attr("d", d => {
          // TODO: stop using stroke-width.
          // Instead, draw the full path, and close the shape.
          // So it will basically be this path shifted up and down,
          // then closed.
          // var curvature = .5;

          // var x0 = 0,
          //     x1 = x(1) - nodeWidth,
          //     xi = d3.interpolateNumber(x0, x1),
          //     x2 = xi(curvature),
          //     x3 = xi(1 - curvature),
          //     y0 = d.sourceObject.y + d.sy + d.dy / 2,
          //     y1 = d.targetObject.y + d.ty + d.dy / 2;

          // return "M" + x0 + "," + y0
          //     + "C" + x2 + "," + y0
          //     + " " + x3 + "," + y1
          //     + " " + x1 + "," + y1;



          var curvature = .5,
          dy = Math.max(1, d.dy);

          var x0 = 0,
              x1 = x(1) - nodeWidth,
              xi = d3.interpolateNumber(x0, x1),
              x2 = xi(curvature),
              x3 = xi(1 - curvature),
              y0 = d.sourceObject.y + d.sy,
              y1 = d.targetObject.y + d.ty;
          return "M" + x0 + "," + y0
            + "C" + x2 + "," + y0
              + " " + x3 + "," + y1
              + " " + x1 + "," + y1
              + "L" + x1 + "," + (y1 + dy)
              + "C" + x3 + "," + (y1 + dy)
              + " " + x2 + "," + (y0 + dy)
              + " " + x0 + "," + (y0 + dy)
            + "Z";
        })
      // .attr("stroke-width", d => Math.max(1, d.dy))
    .sort(function(a, b) { return b.dy - a.dy; })
    .select('title')
    .text(d => `${d.sourceObject.id} → ${d.targetObject.id}: ${d.value}`);

}

function insertDiagram(id, csvUrl, pixelsPerUnit) {

  let oddSyllableSortOrder = ["high, flat", "high, gliss.desc", "high, gliss.asc",
                              "low, flat", "low, gliss.desc", "low, gliss.asc",
                              "End"];
  let evenSyllableSortOrder = ["low, flat", "low, gliss.desc", "low, gliss.asc",
                               "high, flat", "high, gliss.desc", "high, gliss.asc",
                               "End"];

  pixelsPerUnit = pixelsPerUnit | 1;

  d3.text(csvUrl, (error, text) => {
    insertDiagram2(document.getElementById(id), text, pixelsPerUnit,
                   [oddSyllableSortOrder, evenSyllableSortOrder]);
  });

}

export { insertDiagram, insertDiagram2 };
