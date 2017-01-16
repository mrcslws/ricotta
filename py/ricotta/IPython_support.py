import csv
import io
import os
import uuid
import numbers

from pkg_resources import resource_string

from IPython.display import HTML, display


def get_ricotta_js():
    path = os.path.join('package_data', 'ricotta-bundle.js')
    ricotta_js = resource_string('ricotta', path).decode('utf-8')
    return ricotta_js


def init_notebook_mode():
    script_inject = u"""
    <script type='text/javascript'>
      if(!window.ricotta) {{
        define('ricotta', function(require, exports, module) {{
          {script}
        }});
        require(['ricotta'], function(ricotta) {{
          window.ricotta = ricotta;
        }});
      }}
    </script>
    """.format(script=get_ricotta_js())

    display(HTML(script_inject))


def print_sankey_sequence_diagram(sequences, sortOrders=None):

    if sortOrders is not None and len(sortOrders) > 0:
        if isinstance(sortOrders[0], numbers.Number):
            sortOrdersText = "%s" % [sortOrders]
        else:
            sortOrdersText = "%s" % sortOrders
    else:
        sortOrdersText = "null"

    with io.BytesIO() as textOut:
        csvOut = csv.writer(textOut)
        csvOut.writerows(sequences)

        sequencesCsvText = textOut.getvalue()

    elementId = str(uuid.uuid1())
    addChart = """
    <style>
    .group-tick line {
    stroke: #000;
    }

    .ribbons {
    fill-opacity: 0.67;
    }

    .node rect {
    cursor: move;
    fill-opacity: .9;
    shape-rendering: crispEdges;
    }

    .node text {
    pointer-events: none;
    text-shadow: 0 1px 0 #fff;
    }

    .link {
    /*fill: none;*/
    /*stroke: #000;*/
    fill-opacity: .5;
    }

    .link:hover {
    fill-opacity: .8;
    }

    div.ricotta-output svg {
    max-width: initial;
    }

    </style>
    <div class="ricotta-output" id="%s" style="-webkit-touch-callout: none; -webkit-user-select: none; -moz-user-select: none;
    -ms-user-select: none; user-select: none; font: 10px sans-serif;"></div>
    <script>
    require(['ricotta'], function(ricotta) {
      ricotta.insertDiagram2(document.getElementById('%s'), '%s', 1, %s);
    });
    </script>
    """ % (elementId, elementId,
           sequencesCsvText.replace('\r', '\\r').replace('\n', '\\n'),
           sortOrdersText)

    display(HTML(addChart))
