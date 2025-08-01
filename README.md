# TerraFirmaCraft Anvil Helper

Faithful recreation of the in-game TerraFirmaCraft anvil interface with some features to help you perform the optimal forging steps for a recipe

![New GIF Demo](assets/slider.png)

Available at https://iagocq.github.io/tfc-anvil/

---
**Table of Contents**
- [TerraFirmaCraft Anvil Helper](#terrafirmacraft-anvil-helper)
  - [Features](#features)
  - [Usage Example](#usage-example)
  - [License](#license)


## Features

- See the steps required to get the green slider to the red slider while respecting the forging constraints
  - The program has an algorithm that tries to take close to the optimal number of steps to get you to the goal, so you should have Perfectly Forged items most of the time!
- Paste a screenshot of the in-game anvil interface to automatically set up the red and green sliders
  - Try to contain the screenshot to the inventory region to avoid failures in detection
- Set constraints by clicking on the empty space at the top
- Perform forging steps by clicking on the red and green buttons
- Move the red and green sliders freely
- Set special constraints (Not Last, Any) by clicking on the orange/green indicators (the things with 3 thin rows between the expected steps and the last performed steps)

## Usage Example

Using the software to forge a bronze axe head

![New GIF Demo](assets/slider.png)

## Numeric Inputs

- **Sliders**: Use numeric inputs to set the exact slider positions, ranging from 0 to 150.
- **Real-time Validation**: Inputs are validated on the go to ensure they stay within the valid range and provide immediate feedback.

## Rule Form Syntax

- **Format**: Enter rules in the format 'N Action Position' (e.g., '1 Hit Not Last').
- **Positions**: Specify positions like 'Last', 'Second Last', 'Not Last', etc.

## Recipe System

- **Load/Save Recipes**: Save your current forging setup and rules as a recipe.
- **Manage Recipes**: Use the gear icon to rename or delete existing recipes efficiently.

## License

The Minecraft font is (c) [Idrees Hassan](https://github.com/IdreesInc) and is licensed under the SIL Open Font License version 1.1. Check the license in the [Minecraft.otf.LICENSE file](./Minecraft.otf.LICENSE). The font and other variations are housed in the [IdreesInc/Minecraft-font repository](https://github.com/IdreesInc/Minecraft-Font).

This software is licensed under the GNU Affero General Public License version 3. Check the license in the [LICENSE file](./LICENSE).
