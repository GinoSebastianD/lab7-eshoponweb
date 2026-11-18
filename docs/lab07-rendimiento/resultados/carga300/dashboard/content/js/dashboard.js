/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 92.85714285714286, "KoPercent": 7.142857142857143};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9285714285714286, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "TC01 Listar productos"], "isController": false}, {"data": [1.0, 500, 1500, "TC06 Actualizar carrito"], "isController": false}, {"data": [1.0, 500, 1500, "TC04 Editar producto"], "isController": false}, {"data": [1.0, 500, 1500, "TC03 Crear producto"], "isController": false}, {"data": [1.0, 500, 1500, "TC02 Filtrar catálogo"], "isController": false}, {"data": [1.0, 500, 1500, "PREP Carrito - añadir"], "isController": false}, {"data": [1.0, 500, 1500, "PREP Carrito - token"], "isController": false}, {"data": [1.0, 500, 1500, "TC05 Eliminar producto"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 4200, 300, 7.142857142857143, 82.7349999999999, 1, 1113, 5.0, 42.0, 1006.9499999999998, 1017.0, 106.07399924232858, 673.0052671975628, 56.191620824914764], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["TC01 Listar productos", 300, 300, 100.0, 1013.2099999999999, 1001, 1113, 1014.0, 1018.0, 1020.0, 1082.99, 10.42825361512792, 18.65557542234427, 1.6294146273637375], "isController": false}, {"data": ["TC06 Actualizar carrito", 600, 0, 0.0, 4.913333333333333, 2, 42, 4.0, 7.0, 8.0, 39.88000000000011, 16.168148746968473, 110.3005633589329, 10.875922089733226], "isController": false}, {"data": ["TC04 Editar producto", 600, 0, 0.0, 4.191666666666667, 1, 81, 2.0, 5.0, 6.0, 66.0, 32.08899347523799, 12.31086087081506, 23.122094024093485], "isController": false}, {"data": ["TC03 Crear producto", 600, 0, 0.0, 3.641666666666665, 1, 131, 3.0, 5.0, 8.0, 23.960000000000036, 31.695721077654518, 13.888854496830428, 23.059875198098258], "isController": false}, {"data": ["TC02 Filtrar catálogo", 600, 0, 0.0, 15.193333333333317, 8, 131, 14.0, 18.0, 22.0, 48.930000000000064, 31.598904571308193, 328.76438408468505, 5.770503080893196], "isController": false}, {"data": ["PREP Carrito - añadir", 600, 0, 0.0, 7.554999999999999, 3, 307, 6.0, 10.0, 12.0, 30.940000000000055, 16.034206306787812, 114.77328717931587, 15.172994053981828], "isController": false}, {"data": ["PREP Carrito - token", 600, 0, 0.0, 35.606666666666705, 23, 100, 34.0, 44.0, 48.0, 76.98000000000002, 15.986784258346434, 292.11789087687515, 1.8578391862726813], "isController": false}, {"data": ["TC05 Eliminar producto", 300, 0, 0.0, 2.8766666666666674, 1, 27, 2.0, 4.0, 6.0, 10.0, 16.220600162206, 1.283074817518248, 8.569672546634225], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,009 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,007 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 6, 2.0, 0.14285714285714285], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,019 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 3, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,008 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 7, 2.3333333333333335, 0.16666666666666666], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,020 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 4, 1.3333333333333333, 0.09523809523809523], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,066 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,005 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 16, 5.333333333333333, 0.38095238095238093], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,017 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 24, 8.0, 0.5714285714285714], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,016 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 43, 14.333333333333334, 1.0238095238095237], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 21, 7.0, 0.5], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,006 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 12, 4.0, 0.2857142857142857], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,109 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,018 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 17, 5.666666666666667, 0.40476190476190477], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,001 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 5, 1.6666666666666667, 0.11904761904761904], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,013 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 17, 5.666666666666667, 0.40476190476190477], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,012 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 10, 3.3333333333333335, 0.23809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,035 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,003 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 21, 7.0, 0.5], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,015 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 29, 9.666666666666666, 0.6904761904761905], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,002 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 15, 5.0, 0.35714285714285715], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,014 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 33, 11.0, 0.7857142857142857], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,032 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,113 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,083 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,010 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,082 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,022 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 3, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,023 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 2, 0.6666666666666666, 0.047619047619047616], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,081 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 0.3333333333333333, 0.023809523809523808], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,011 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 2, 0.6666666666666666, 0.047619047619047616], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 4200, 300, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,016 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 43, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,014 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 33, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,015 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 29, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,017 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 24, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 21], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["TC01 Listar productos", 300, 300, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,016 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 43, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,014 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 33, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,015 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 29, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,017 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 24, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 21], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
