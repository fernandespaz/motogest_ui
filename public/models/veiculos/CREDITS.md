# Créditos dos modelos 3D de veículos

Os arquivos `sedan.glb`, `suv.glb` e `picape.glb` são versões simplificadas (sem texturas, sem
interior/motor, malha reduzida) de modelos publicados no Sketchfab sob a licença
**Creative Commons Attribution (CC BY)**. A licença exige o crédito ao autor.

| Arquivo | Modelo original | Autor |
|---|---|---|
| `sedan.glb` | [Generic Sedan Car](https://sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5) | MMC Works |
| `suv.glb` | [MMC Generic Small SUV Car](https://sketchfab.com/3d-models/mmc-generic-small-suv-car-5db696c6ed5d4bdc87905c1040fa072a) | MMC Works |
| `picape.glb` | [2022 Toyota Hilux](https://sketchfab.com/3d-models/2022-toyota-hilux-82bd37c5065040098fb0b86e07fcb959) | BHP3D |

Observações:
- O Generic Sedan Car traz o selo **NoAI** do autor: o modelo não pode ser usado em datasets nem
  como entrada de programas de IA generativa.
- O modelo da picape reproduz um veículo de marca real (Toyota Hilux). Avaliar com o jurídico se
  o uso comercial no produto exige substituí-lo por um modelo genérico.
- Os arquivos originais não ficam no repositório (16 a 42 MB cada); o processo de simplificação
  foi: remover texturas e peças internas, unificar em 3 materiais (carroceria, vidro, pneu),
  simplificar a malha e comprimir com meshopt (`@gltf-transform/cli`).
