import csv
import io
import json
import numbers
import os
import uuid

from pkg_resources import resource_string

from IPython.display import HTML, display


def get_ricotta_js():
    path = os.path.join('package_data', 'ricotta-bundle.js')
    ricotta_js = resource_string('ricotta', path).decode('utf-8')
    return ricotta_js


def init_notebook_mode():
    style_inject = """
    <style>
    .link {
      fill-opacity: .5;
    }

    .link:hover {
      fill-opacity: .8;
    }

    div.ricotta-output {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;

      font: 10px sans-serif;
    }

    div.ricotta-output svg {
      max-width: initial;
    }

    </style>
    """

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

    display(HTML(style_inject + script_inject))


def print_sankey_sequence_diagram(sequences, sortOrders=None, colorMapping=None):

    if sortOrders is not None and len(sortOrders) > 0:
        if isinstance(sortOrders[0], numbers.Number):
            sortOrdersText = "%s" % [sortOrders]
        else:
            sortOrdersText = "%s" % sortOrders
    else:
        sortOrdersText = "null"

    if colorMapping is not None:
        colorMappingText = json.dumps(colorMapping)
    else:
        colorMappingText = "null"

    with io.BytesIO() as textOut:
        csvOut = csv.writer(textOut)
        csvOut.writerows(sequences)

        sequencesCsvText = textOut.getvalue()

    elementId = str(uuid.uuid1())
    addChart = """
    <div class="ricotta-output" id="%s"></div>
    <script>
    require(['ricotta'], function(ricotta) {
      ricotta.insertDiagram2(document.getElementById('%s'), '%s', 1, %s, %s);
    });
    </script>
    """ % (elementId, elementId,
           sequencesCsvText.replace('\r', '\\r').replace('\n', '\\n'),
           sortOrdersText,
           colorMappingText)

    display(HTML(addChart))
