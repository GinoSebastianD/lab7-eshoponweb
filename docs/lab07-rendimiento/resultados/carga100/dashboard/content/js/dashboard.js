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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1400, 100, 7.142857142857143, 78.84071428571427, 0, 1089, 3.0, 26.0, 1004.0, 1012.99, 35.902959429655844, 227.77685449203724, 19.01597140746012], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["TC01 Listar productos", 100, 100, 100.0, 1008.8100000000002, 1001, 1089, 1008.0, 1013.0, 1017.8499999999999, 1088.3299999999997, 3.5642999714856, 6.373274656045052, 0.556921870544625], "isController": false}, {"data": ["TC06 Actualizar carrito", 200, 0, 0.0, 2.9850000000000008, 1, 26, 3.0, 4.0, 5.0, 13.920000000000073, 5.4473648372599754, 37.160497242271546, 3.6623953084570338], "isController": false}, {"data": ["TC04 Editar producto", 200, 0, 0.0, 2.3449999999999998, 0, 75, 2.0, 3.0, 4.0, 7.980000000000018, 10.790978741771879, 4.136875556409842, 7.772508042651344], "isController": false}, {"data": ["TC03 Crear producto", 200, 0, 0.0, 2.334999999999999, 1, 54, 2.0, 3.0, 4.949999999999989, 7.0, 10.807305738679347, 4.717642251161785, 7.862737085269642], "isController": false}, {"data": ["TC02 Filtrar catálogo", 200, 0, 0.0, 10.43499999999999, 6, 95, 9.0, 13.0, 15.949999999999989, 50.69000000000028, 10.760787689658883, 111.9584297320564, 1.9651047831701283], "isController": false}, {"data": ["PREP Carrito - añadir", 200, 0, 0.0, 5.23, 2, 167, 4.0, 7.0, 8.949999999999989, 17.960000000000036, 5.424464334147003, 38.826556990778414, 5.133111269324655], "isController": false}, {"data": ["PREP Carrito - token", 200, 0, 0.0, 22.730000000000008, 15, 94, 21.0, 28.0, 31.94999999999999, 50.950000000000045, 5.410523468145542, 98.86357872311645, 0.6287620045989449], "isController": false}, {"data": ["TC05 Eliminar producto", 100, 0, 0.0, 2.839999999999999, 0, 74, 2.0, 4.0, 4.0, 73.32999999999966, 5.532197388802833, 0.43760545751272406, 2.9227722532639966], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,009 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 7, 7.0, 0.5], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,001 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,013 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 7, 7.0, 0.5], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,012 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 8, 8.0, 0.5714285714285714], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,007 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 6, 6.0, 0.42857142857142855], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,003 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 12, 12.0, 0.8571428571428571], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,015 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 2, 2.0, 0.14285714285714285], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,019 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,002 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 3, 3.0, 0.21428571428571427], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,008 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 4, 4.0, 0.2857142857142857], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,089 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,005 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 4, 4.0, 0.2857142857142857], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 18, 18.0, 1.2857142857142858], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,006 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 4, 4.0, 0.2857142857142857], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,021 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,010 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 10, 10.0, 0.7142857142857143], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,018 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,022 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 1, 1.0, 0.07142857142857142], "isController": false}, {"data": ["La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,011 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 9, 9.0, 0.6428571428571429], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1400, 100, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 18, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,003 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 12, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,010 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 10, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,011 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 9, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,012 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 8], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["TC01 Listar productos", 100, 100, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,004 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 18, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,003 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 12, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,010 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 10, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,011 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 9, "La operaci&oacute;n dur&oacute; demasiado: tard&oacute; 1,012 milisegundos, cuando no deber&iacute;a haber tardado m&aacute;s de 1,000 milisegundos.", 8], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
