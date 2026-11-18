# Local Forest Watch

<p align="center">
  <img src="https://img.shields.io/badge/License-GPLv3-blue" alt="GPLv3" />
  <img src="https://img.shields.io/badge/lifecycle-experimental-orange.svg" alt="experimental" />
  <img src="https://img.shields.io/badge/Google%20Earth%20Engine-4285F4?logo=googleearthengine&logoColor=white" alt="Google Earth Engine" />
</p>

Aplicativo do Google Earth Engine para avaliar a cobertura florestal e a altura do dossel em uma área pequena (um talhão, um fragmento, uma propriedade). Ele junta a refletância de superfície do **Sentinel-2** com o mapa global de altura do dossel da **Meta (1 m)**: classifica o NDVI por quebras naturais de Jenks, toma a classe mais alta como floresta e calcula a altura média e máxima do dossel dentro dessa máscara.

**Abrir o aplicativo:** https://programa-r-316514.projects.earthengine.app/view/forest-canopy

<p align="center">
  <img src="figures/image1.png" width="85%" alt="Interface do aplicativo" />
</p>

## Sumário

- [Como usar](#como-usar)
- [Metodologia](#metodologia)
- [Camadas e resultados](#camadas-e-resultados)
- [Dados utilizados](#dados-utilizados)
- [Executar no Code Editor](#executar-no-code-editor)
- [Parâmetros configuráveis](#parâmetros-configuráveis)
- [Limitações](#limitações)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como citar](#como-citar)
- [Licença](#licença)

## Como usar

1. **Defina a área de interesse (ROI)**, de uma destas formas:
   - informe latitude, longitude e o tamanho da área em metros (gera um quadrado em volta do ponto); ou
   - desenhe um polígono no mapa com a ferramenta de desenho. O polígono tem prioridade sobre as coordenadas.
2. **Configure a busca do Sentinel-2:**
   - data inicial e final (`YYYY-MM-dd`);
   - percentual máximo de nuvens por cena (`CLOUDY_PIXEL_PERCENTAGE`);
   - número de classes de Jenks (2 a 10; padrão 3).
3. Clique em **Run Analysis**.

Acima do zoom 12 o mapa mostra um mosaico Sentinel-2 dos últimos 3 meses como fundo, o que ajuda a localizar a área antes de rodar a análise.

## Metodologia

```
Sentinel-2 SR (período + filtro de nuvens)
        │  mediana
        ▼
     NDVI = (B8 − B4) / (B8 + B4)
        │  5 000 pixels amostrados a 10 m
        ▼
  Quebras naturais de Jenks (k classes)
        │  classe mais alta = floresta
        ▼
   Máscara de floresta ──► % de cobertura florestal
        │
        ▼
  Meta Canopy Height (1 m) dentro da máscara ──► altura média e máxima
```

1. **Composição Sentinel-2.** Filtra `COPERNICUS/S2_SR_HARMONIZED` pela ROI, pelo período e pelo limite de nuvens e calcula a mediana.
2. **NDVI.** Calculado sobre a mediana, recortada pela ROI.
3. **Jenks.** 5 000 pixels de NDVI são amostrados (semente fixa 42) e as quebras naturais são calculadas no cliente. Os pixels com NDVI maior ou igual ao limite inferior da última classe formam a máscara de floresta.
4. **Cobertura florestal.** Pixels de floresta divididos pelo total de pixels válidos da ROI, a 10 m.
5. **Altura do dossel.** O mosaico da Meta é recortado pela ROI e as estatísticas (média e máxima) são calculadas a 1 m, só nos pixels de floresta.

## Camadas e resultados

| Camada | Visível por padrão | Descrição |
|---|---|---|
| Sentinel-2 basemap | sim | Mediana do período, cores verdadeiras (B4/B3/B2) |
| Sentinel-2 (data) | sim | Cena mais recente do período, recortada pela ROI |
| NDVI | não | Paleta azul → branco → verde (0 a 1) |
| Forest Cover (Jenks Class k) | sim | Classe mais alta de Jenks, em verde-escuro |
| Canopy Height (m) | não | Altura do dossel da Meta, 0 a 30 m |
| ROI | sim | Contorno da área analisada |

O painel lateral mostra a data da imagem, o percentual de cobertura florestal, os intervalos de cada classe de Jenks e a altura média e máxima do dossel na área de floresta. A legenda no canto do mapa mostra só as faixas de NDVI e de altura presentes na ROI.

| Sentinel-2 | NDVI | Floresta | Altura do dossel |
|:---:|:---:|:---:|:---:|
| <img src="figures/image2.png" width="220" /> | <img src="figures/image3.png" width="220" /> | <img src="figures/image4.png" width="220" /> | <img src="figures/image5.png" width="220" /> |

## Dados utilizados

| Dado | ID no Earth Engine | Resolução |
|---|---|---|
| Sentinel-2 MSI Level-2A (harmonizado) | `COPERNICUS/S2_SR_HARMONIZED` | 10 m |
| Meta / WRI Global Canopy Height | `projects/meta-forest-monitoring-okw37/assets/CanopyHeight` | 1 m |

- Tolan, J. et al. (2024). *Very high resolution canopy height maps from RGB imagery using self-supervised vision transformer and convolutional decoder trained on aerial lidar.* Remote Sensing of Environment, 300, 113888. https://doi.org/10.1016/j.rse.2023.113888
- Jenks, G. F. (1967). *The data model concept in statistical mapping.* International Yearbook of Cartography, 7, 186–190.

## Executar no Code Editor

1. Abra o [Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Crie um script novo e cole o conteúdo de [`forest-canopy.js`](forest-canopy.js).
3. Clique em **Run**. A interface substitui o mapa padrão do Code Editor.

Para publicar como aplicativo: **Apps → New App**, selecione o script e publique.

## Parâmetros configuráveis

Os valores padrão ficam no início de [`forest-canopy.js`](forest-canopy.js):

| Constante | Padrão | Uso |
|---|---|---|
| `DEFAULT_START_DATE` / `DEFAULT_END_DATE` | `2024-07-01` / `2026-08-28` | Período inicial da busca |
| `DEFAULT_CLOUD_LIMIT` | `20` | % máximo de nuvens por cena |
| `DEFAULT_JENKS_CLASSES` | `3` | Número de classes de Jenks |
| `DEFAULT_BUFFER_RADIUS_M` | `100` | Tamanho da ROI quando definida por coordenadas |
| `TRAIN_PIXELS` / `TRAIN_SCALE` | `5000` / `10` | Amostra de NDVI usada no Jenks |
| `S2_BASEMAP_ZOOM_THRESHOLD` | `12` | Zoom a partir do qual aparece o fundo Sentinel-2 |
| `S2_BASEMAP_MONTHS_BACK` | `3` | Meses usados no fundo Sentinel-2 |

## Limitações

- **Nuvens e sombras não são mascaradas pixel a pixel.** O filtro é por cena. Nuvens baixam o NDVI e podem ser classificadas como não floresta; use um período maior ou um limite de nuvens menor.
- **A classe "floresta" é relativa à ROI.** O Jenks separa os valores presentes na área. Numa ROI quase toda florestada, a classe mais alta pode excluir parte da floresta; numa área sem floresta, a classe mais alta ainda será marcada como floresta.
- **A altura do dossel é de um único momento.** O mapa da Meta usa imagens de diferentes anos (em geral 2018–2020) e não reflete desmatamento ou crescimento posterior.
- **Áreas grandes.** As estatísticas a 1 m usam `bestEffort`; em ROIs grandes o Earth Engine pode reduzir a resolução ou exceder o tempo limite.

## Estrutura do repositório

```
forest-canopy/
├── forest-canopy.js   # Script do aplicativo (Earth Engine Code Editor)
├── figures/           # Capturas de tela usadas neste README
├── LICENSE
└── README.md
```

## Como citar

> Cunha, M. A. (2026). *Local Forest Watch: cobertura florestal e altura do dossel com Sentinel-2 e Meta Canopy Height.* GitHub. https://github.com/migualex/forest-canopy

## Licença

Distribuído sob a [GNU General Public License v3.0](LICENSE). Você pode usar, estudar, modificar e redistribuir o código, desde que mantenha os avisos de copyright e a mesma licença em cópias e trabalhos derivados.
