/**
 * Game-style Blockly theme — dark workspace with vibrant block colours.
 * Import this before calling Blockly.inject().
 */

export function createGameTheme() {
    return Blockly.Theme.defineTheme('gameTheme', {
        name: 'gameTheme',

        // Block colour overrides — vivid, game-like palette
        blockStyles: {
            logic_blocks:    { colourPrimary: '#5C81A6', colourSecondary: '#3D6B8E', colourTertiary: '#2A4F6E' },
            loop_blocks:     { colourPrimary: '#5BA55B', colourSecondary: '#3D8A3D', colourTertiary: '#2A6B2A' },
            math_blocks:     { colourPrimary: '#5B67A5', colourSecondary: '#3D4F8E', colourTertiary: '#2A3A6E' },
            text_blocks:     { colourPrimary: '#5BA58C', colourSecondary: '#3D8A72', colourTertiary: '#2A6B57' },
            list_blocks:     { colourPrimary: '#745BA5', colourSecondary: '#5C3D8E', colourTertiary: '#452A6E' },
            colour_blocks:   { colourPrimary: '#A5745B', colourSecondary: '#8E5C3D', colourTertiary: '#6E452A' },
            variable_blocks: { colourPrimary: '#A55B80', colourSecondary: '#8E3D65', colourTertiary: '#6E2A4D' },
            variable_dynamic_blocks: { colourPrimary: '#A55B80', colourSecondary: '#8E3D65', colourTertiary: '#6E2A4D' },
            procedure_blocks: { colourPrimary: '#995BA5', colourSecondary: '#7A3D8E', colourTertiary: '#5E2A6E' },
        },

        // Category colours in the toolbox
        categoryStyles: {
            logic_category:    { colour: '#5C81A6' },
            loop_category:     { colour: '#5BA55B' },
            math_category:     { colour: '#5B67A5' },
            text_category:     { colour: '#5BA58C' },
            list_category:     { colour: '#745BA5' },
            colour_category:   { colour: '#A5745B' },
            variable_category: { colour: '#A55B80' },
            procedure_category:{ colour: '#995BA5' },
        },

        // Workspace + component colours
        componentStyles: {
            workspaceBackgroundColour: '#1e1e2e',
            toolboxBackgroundColour:   '#181825',
            toolboxForegroundColour:   '#cdd6f4',
            flyoutBackgroundColour:    '#24273a',
            flyoutForegroundColour:    '#cdd6f4',
            flyoutOpacity:             0.95,
            scrollbarColour:           '#45475a',
            scrollbarOpacity:          0.6,
            insertionMarkerColour:     '#ffffff',
            insertionMarkerOpacity:    0.3,
            markerColour:              '#ffffff',
            cursorColour:              '#d0d0d0',
        },

        fontStyle: {
            family: '"Segoe UI", "Nunito", sans-serif',
            weight: '600',
            size:   11,
        },

        startHats: true,
    });
}
