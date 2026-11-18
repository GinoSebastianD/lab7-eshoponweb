# Nuestro proyecto de pruebas de rendimiento

Nuestro equipo mantiene este proyecto de JMeter separado de las pruebas unitarias y de Selenium. El archivo principal es `Lab07_eShopOnWeb.jmx`; `run.py` prepara datos temporales y ejecuta los escenarios con autenticación y sesiones reales.

## Preparación

Instalamos Python 3, Java 17 o superior, .NET 10 y [Apache JMeter 5.6.3](https://jmeter.apache.org/download_jmeter.cgi). Para la entrega usamos Java 21 y verificamos el ZIP oficial de JMeter con SHA-512:

```text
387fadca903ee0aa30e3f2115fdfedb3898b102e6b9fe7cc3942703094bd2e65b235df2b0c6d0d3248e74c9a7950a36e42625fd74425368342c12e40b0163076
```

Desde la raíz del repositorio compilamos:

```powershell
dotnet build src/Web/Web.csproj
dotnet build src/PublicApi/PublicApi.csproj
```

## Ejecución reproducible

Ejecutamos las fases una por una, ajustando las rutas de nuestras instalaciones. Usamos una carpeta de salida nueva para conservar la evidencia entregada:

```powershell
python performance-tests/Lab07.JMeter/run.py --phase preliminar --dotnet "C:/ruta/dotnet.exe" --jmeter "C:/ruta/apache-jmeter-5.6.3" --java "C:/ruta/java.exe" --work ".lab07-work" --output ".lab07-results"
```

Repetimos el comando cambiando `--phase` a `carga100`, `carga300` o `assert1ms`. Nuestro ejecutor utiliza únicamente `127.0.0.1:5197` y `127.0.0.1:5198`, comprueba que los puertos estén libres y detiene los servicios que inicia. No modifica ni usa una tienda externa.

La fase `assert1ms` debe fallar su aserción de tiempo: usamos 1 ms deliberadamente como demostración. Un código de salida 0 de JMeter indica que terminó la ejecución, no que todas las aserciones aprobaron; revisamos `success`, `failureMessage` y el dashboard.

Nuestro ejecutor no sobrescribe un `aggregate.csv` existente. Para otra repetición elegimos un `--output` nuevo. Si usamos `--hold`, dejamos los servicios abiertos para revisar el catálogo; para cerrarlos creamos un archivo llamado `stop` dentro de `<work>/<fase>/`.

## Datos y parámetros

Obtenemos la contraseña pública de demostración del código original y autenticamos al usuario `productmgr@microsoft.com`. No almacenamos el JWT en el plan ni en Git. Guardamos propiedades temporales fuera de la entrega y retiramos sus valores del registro publicado.

Nuestro plan admite `listUsers`, `filterUsers`, `createUsers`, `editUsers`, `deleteUsers`, `basketUsers`, `ramp`, `loops`, `think`, `listLimit`, `token` y `dataDir` como propiedades de JMeter. El ejecutor prepara los CSV de IDs y configura la ejecución secuencial de la preliminar. Para cargar el plan manualmente debemos proporcionar esos datos; para reproducir todo preferimos `run.py`.

En TC06 correlacionamos el token antifalsificación y el ID del artículo del carrito, con un Cookie Manager por usuario. Para las escrituras usamos IDs y nombres exclusivos. Al finalizar comprobamos el estado final mediante la API.

Las herramientas descargadas y las compilaciones no se incluyen en Git; sí guardamos todo el código fuente, el plan y las evidencias del laboratorio.
