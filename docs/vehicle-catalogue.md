# Catálogo de Vehículos y Autocompletado - AppArca

## 1. Fuente de Datos y Licencia

- **Repositorio de referencia**: [gor3a/vehicle-makes-models](https://github.com/gor3a/vehicle-makes-models)
- **Licencia de los datos**: [Open Database License (ODbL) v1.0](scripts/data/LICENSE-DATA)
- **Atribución requerida**: Proyecto "vehicle-makes-models" (gor3a) y upstream source autoevolution.com.
- **Licencia del código**: MIT.
- **Coste de uso**: Gratuito, sin dependencias de APIs de pago ni límites de peticiones.

## 2. Análisis de Cobertura y Campos

- **Total de registros analizados**: 30.535 variantes de motorización y versiones.
- **Marcas únicas**: 134 fabricantes globales.
- **Cobertura en el mercado español**:
  - Incluye todos los fabricantes líderes de ventas en España: SEAT (Ibiza, León, Ateca, Arona, Tarraco...), Renault (Clio, Megane, Captur, Scenic, Austral...), Peugeot (208, 308, 2008, 3008...), Volkswagen (Golf, Polo, T-Roc, Tiguan...), Toyota (Corolla, Yaris, C-HR, RAV4...), Citroën (C3, C4, C5...), Ford, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Nissan, Fiat, Cupra, etc.
- **Dimensiones técnicas**:
  - El **97,2%** de las variantes cuentan con las 3 dimensiones completas: Longitud, Anchura y Altura.
  - Vienen dadas originalmente en milímetros (`mm`) y se normalizan a metros (`m`) dividiendo entre 1000 con 2 decimales para compatibilidad con las dimensiones de plazas de AppArca.
- **Propulsión y electrificación**:
  - Identificación explícita de `Gasoline`, `Diesel`, `Hybrid`, `Electric`, `Plug-in Hybrid`, `Mild Hybrid`, `LPG`, `Natural Gas`, etc.
  - Se mapean a tipos controlados: `GASOLINA`, `DIESEL`, `HIBRIDO_NO_ENCHUFABLE` (HEV/MHEV), `HIBRIDO_ENCHUFABLE` (PHEV), `ELECTRICO_PURO` (BEV) y `OTRO`.
  - Se distingue expresamente `esEnchufable = true` únicamente para eléctricos puros (`BEV`) e híbridos enchufables (`PHEV`).

## 3. Criterios de Etiqueta Ambiental DGT

Siguiendo la normativa oficial de la DGT de España y las directrices de fiabilidad:
- **0 Emisiones (`CERO`)**:
  - Vehículos 100% eléctricos de batería (`ELECTRICO_PURO` / BEV) -> **Fiable: Sí**.
  - Híbridos enchufables con autonomía >= 40 km -> Como la autonomía exacta no siempre consta en el dataset, se sugiere con advertencia para que el usuario confirme si su vehículo dispone de distintivo CERO o ECO.
- **ECO**:
  - Vehículos híbridos no enchufables (`HEV`), Mild Hybrid (`MHEV`) y gas natural/GLP posteriores a las normativas Euro correspondientes -> **Sugerida / Fiable**.
- **C**:
  - Turismos de gasolina matriculados a partir de enero de 2006 (Euro 4, 5 o 6).
  - Turismos diésel matriculados a partir de septiembre de 2015 (Euro 6).
- **B**:
  - Turismos de gasolina matriculados entre 2001 y 2005 (Euro 3).
  - Turismos diésel matriculados entre 2006 y agosto de 2015 (Euro 4 o 5).
- **Sin distintivo (`SIN_DISTINTIVO`)**:
  - Gasolina anteriores a 2001 o diésel anteriores a 2006.

> **Importante**: Si el vehículo se encuentra en un año fronterizo o no se dispone de suficiente información técnica homologada, el sistema solicita al usuario que seleccione o confirme su etiqueta manualmente. El valor oficial final siempre es revisable y modificable por el usuario.
