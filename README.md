# Local Forest Cover

<p align="center">
  <img src="https://img.shields.io/badge/License-GPLv3-blue" />
  <img src="https://img.shields.io/badge/lifecycle-experimental-orange.svg" />
  <img src="https://img.shields.io/badge/Google%20Earth%20Engine-4285F4?logo=googleearthengine&logoColor=white" alt="Google Earth Engine" />
</p>

### 1. Defina a área de interesse
- Informe Latitude, Longitude e o tamanho da área de interesse (em metros), ou
- Desenhe um polígono diretamente no mapa.

![](figures/image1.png)

### 2. Configure a busca do Sentinel-2
- Defina a data inicial e a data final (formato `YYYY-MM-dd`).
- Defina o percentual máximo de nuvens nas imagens.

![](figures/image2.png)

### 3. Análise
Clique em **Run Analysis** para:
- Carregar o mosaico Sentinel-2 mais adequado para o ROI;
- Calcular o NDVI e classificar a cobertura florestal (K-Means);
![](figures/image3.png)
![](figures/image4.png)
- Estimar a altura do dossel e o percentual de área com árvores altas.
![](figures/image5.png)

## Metodologia

### Classificação K-Means

A classificação não supervisionada, baseada no NDVI calculado sobre o mosaico do Sentinel-2:

1. Amostragem de até 5000 pixels de NDVI na ROI.
2. Treinamento de um `ee.Clusterer.wekaKMeans(2)` (floresta e não-floresta) sobre as amostras.
4. Identificação do cluster "floresta" como aquele com maior NDVI médio.
5. Cálculo do percentual de floresta via histograma de frequência dos clusters.

O threshold é a média entre os dois centros de cluster e serve como referência, os grupos são definidos estatisticamente a cada execução, podendo variar entre áreas e datas distintas.

### Altura de dossel

Dataset global de altura de vegetação desenvolvido pela Meta em parceria com o World Resources Institute (WRI) (`projects/meta-forest-monitoring-okw37/assets/CanopyHeight`), com resolução espacial de 1 metro.

- Gerado por um modelo de IA treinado sobre imagens ópticas do Maxar Vivid2 (0,5 m resolução espacial), calibrado com dados de referência LiDAR aéreo e GEDI.
- Estima a altura do dossel normalizada em relação ao solo.
- Sensível a nuvens/sombras: em regiões de cobertura de nuvens persistente pode apresentar artefatos.

## Licença

Este projeto é distribuído sob a licença GNU General Public License v3.0.

Você é livre para usar, estudar, modificar e distribuir este software, desde que mantenha os avisos de copyright e a licença original em qualquer cópia ou trabalho derivado, conforme exigido pela GPL-3.0.
