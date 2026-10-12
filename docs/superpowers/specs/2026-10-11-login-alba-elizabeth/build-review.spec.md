# Contrato del generador de revisión

Lee la referencia LOGIN-003 y el módulo puro de Elizabeth; escribe sólo maqueta.js en esta
carpeta. El script exige los fragmentos esperados antes de reemplazarlos y falla si la referencia
cambia, para evitar aplicar una modificación silenciosa sobre otra versión.

La maqueta conserva los activos originales, la licencia de la fuente y los eventos tipados;
añade composición, texto completo y protección ante rendimiento lento. El generador no abre
sesiones, no ejecuta comandos Git ni modifica archivos de la aplicación. El resultado se verifica
con node --check y una revisión de navegador, además del portón del personaje reusable.
