# Laboratorio 07 - Pruebas de rendimiento

Nuestro equipo ejecutó Apache JMeter sobre el mismo eShopOnWeb de los laboratorios anteriores. Adaptamos los ejemplos de la guía a seis funciones del proyecto: listar, filtrar, crear, editar, eliminar y actualizar el carrito.

## Nuestra entrega

- [Informe sin carátula](Informe_Lab07_Pruebas_Rendimiento.pdf), redactado como equipo.
- [Casos de prueba en formato tabular](Casos_de_Prueba.csv).
- [Proyecto independiente de JMeter](../../performance-tests/Lab07.JMeter/), con archivo `.jmx` y ejecutor.
- [Resultados comparativos](Resumen_comparativo.csv) y [datos consolidados](Resumen.json).
- [Capturas reales](capturas/) de JMeter, eShopOnWeb y el dashboard.
- Resultados de [prueba preliminar](resultados/preliminar/), [100 usuarios](resultados/carga100/), [300 usuarios](resultados/carga300/) y [aserción deliberada de 1 ms](resultados/assert1ms/).

En cada carpeta de resultados guardamos `aggregate.csv`, `registro.xml`, `entorno.json`, `verificacion.json`, `ejecucion.log` y el reporte nativo `dashboard/index.html`. Descargamos el repositorio y abrimos ese HTML localmente para visualizarlo; GitHub muestra el código del HTML, no el dashboard interactivo.

## Qué encontramos

Nuestro equipo registró 1400 muestras con 100 usuarios y 4200 con 300. Alcanzamos picos reales de 100 y 300 hilos. El dashboard incluye dos peticiones de preparación por iteración del carrito, por lo que las muestras de los seis casos son 1000 y 3000.

En ambas cargas falló el 100% de las consultas de productos por superar 1000 ms. No registramos errores HTTP. Las otras cinco funciones cumplieron sus aserciones. Detectamos una espera fija `Task.Delay(1000, ct)` en `src/PublicApi/CatalogItemEndpoints/CatalogItemListPagedEndpoint.cs`; conservamos la implementación para mostrar el resultado real.

Con 300 usuarios comprobamos 600 creaciones, 600 ediciones y 300 eliminaciones. El 7.14% de error global incluye las peticiones de preparación; entre las muestras TC el error es 10%. No interpretamos esos fallos de duración como respuestas HTTP fallidas.

## Cómo revisamos las evidencias

1. Abrimos el plan `.jmx` en JMeter.
2. En **Summary Report**, usamos **Browse/Navegar** para cargar el `aggregate.csv` de una ejecución.
3. En **View Results Tree**, cargamos su `registro.xml` para revisar petición, respuesta y aserciones. Vaciamos la vista o reabrimos JMeter antes de cambiar de archivo para no mezclar ejecuciones.
4. Abrimos `dashboard/index.html` de esa misma ejecución.

Retiramos tokens y cookies efímeros de los XML publicados. Conservamos tiempos, estados, cuerpos útiles, nombres de muestras y mensajes de aserción. Las muestras de cada XML coinciden exactamente con su CSV.

## Alcance y límites

Usamos Windows 11, Ryzen 7 7730U (16 procesadores lógicos), Java 21, .NET 10 y JMeter 5.6.3. La revisión de origen es `193ad11` de `GinoSebastianD/lab6-eshoponweb`. Web y API usan bases InMemory separadas, configuración Debug/Development y HTTP local. Obtenemos un token del usuario público de demostración ProductManager antes de iniciar la carga y preparamos productos exclusivos para editar/eliminar.

No incluimos la autenticación inicial ni la preparación de esos productos en las mediciones. Sí incluimos las dos peticiones de preparación del carrito y las identificamos con `PREP`. Ejecutamos 10 iteraciones por usuario, rampa de 10 s y pausa de 1 s antes de cada petición. La prueba preliminar recorre las seis funciones en secuencia con un usuario por grupo.

JMeter y los servidores comparten el equipo con otras aplicaciones. No medimos renderizado, recursos estáticos, TLS ni base SQL. Son mediciones locales cortas, sin calentamiento independiente ni repeticiones estadísticas; no representan un límite de capacidad de producción. Nuestra prueba de 1 ms es una demostración negativa y se conserva por separado.

## Relación con la guía

Nuestro equipo sustituyó el proyecto Java de ejemplo por eShopOnWeb, según la continuidad de los laboratorios. Construimos el plan manualmente, por lo que no necesitamos el proxy de grabación opcional. Incluimos grupos, muestreadores GET/POST/PUT/DELETE, temporizadores, aserciones, Summary Report, View Results Tree, prueba preliminar, cargas dentro de 100 a 1000 usuarios y reportes HTML. Utilizamos 100 y 300 usuarios; no afirmamos haber probado 1000.

## Referencias

- [Descarga oficial de JMeter](https://jmeter.apache.org/download_jmeter.cgi).
- [Ejecución CLI](https://jmeter.apache.org/usermanual/get-started.html#non_gui).
- [Dashboard](https://jmeter.apache.org/usermanual/generating-dashboard.html).
- [Componentes y aserciones](https://jmeter.apache.org/usermanual/component_reference.html).
