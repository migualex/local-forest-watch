# Local Forest Watch

<p align="center">
  <img src="https://img.shields.io/badge/License-GPLv3-blue" />
  <img src="https://img.shields.io/badge/lifecycle-experimental-orange.svg" />
  <img src="https://img.shields.io/badge/Google%20Earth%20Engine-4285F4?logo=googleearthengine&logoColor=white" alt="Google Earth Engine" />
</p>

O aplicativo combina dados de refletância de superfície do Sentinel-2 com o conjunto de dados de alta resolução de Altura do Dossel (Meta Canopy Height), aplicando uma classificação por quebras naturais (Jenks Natural Breaks) sobre o NDVI na região de interesse. https://programa-r-316514.projects.earthengine.app/view/forest-canopy

## Como usar

### 1. Defina a área de interesse
- Informe Latitude, Longitude e o tamanho da área de interesse (em metros), ou
- Desenhe um polígono diretamente no mapa.

### 2. Configure a busca do Sentinel-2
- Defina a data inicial e a data final (formato `YYYY-MM-dd`).
- Defina o percentual máximo de nuvens nas imagens.

### 3. Análise
Clique em **Run Analysis** para:
- Carregar o mosaico Sentinel-2 mais adequado para o ROI;
- Calcular o NDVI e classificar a cobertura florestal (Jenks Natural Breaks);
- Estimar a altura máxima e média do dossel.

## Licença

Este projeto é distribuído sob a licença GNU General Public License v3.0.

Você é livre para usar, estudar, modificar e distribuir este software, desde que mantenha os avisos de copyright e a licença original em qualquer cópia ou trabalho derivado, conforme exigido pela GPL-3.0.
