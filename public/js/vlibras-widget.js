/**
 * VLibras - Widget de Acessibilidade em Libras
 * Plugin oficial do Governo Federal do Brasil
 * Integração modular e reutilizável
 * @version 1.0.0
 * 
 * Compatível com: HTML estático, React, Next.js, WordPress
 * Não bloqueia renderização (carregamento assíncrono)
 * Não conflita com outros widgets (z-index controlado)
 */
(function () {
    'use strict';

    // Evitar duplicação caso o script seja carregado mais de uma vez
    if (document.getElementById('vlibras-widget-container')) return;

    /**
     * Injeta o CSS de posicionamento customizado para o VLibras
     * Posiciona acima do widget de acessibilidade existente (♿)
     */
    function injectStyles() {
        var style = document.createElement('style');
        style.id = 'vlibras-custom-styles';
        style.textContent =
            /* Container principal do VLibras */
            '[vw] .enabled {\n' +
            '    z-index: 999997 !important;\n' +
            '    position: fixed !important;\n' +
            '    bottom: 90px !important;\n' +
            '    right: 20px !important;\n' +
            '}\n' +
            /* Botão de ativação do VLibras */
            '[vw] .access-button {\n' +
            '    z-index: 999997 !important;\n' +
            '    bottom: 90px !important;\n' +
            '    right: 20px !important;\n' +
            '}\n' +
            /* Ajuste mobile */
            '@media (max-width: 640px) {\n' +
            '    [vw] .enabled {\n' +
            '        bottom: 80px !important;\n' +
            '        right: 16px !important;\n' +
            '    }\n' +
            '    [vw] .access-button {\n' +
            '        bottom: 80px !important;\n' +
            '        right: 16px !important;\n' +
            '    }\n' +
            '}\n';
        document.head.appendChild(style);
    }

    /**
     * Cria o elemento HTML necessário pelo VLibras
     */
    function createWidget() {
        var container = document.createElement('div');
        container.id = 'vlibras-widget-container';
        container.setAttribute('vw', '');
        container.classList.add('enabled');

        var accessBar = document.createElement('div');
        accessBar.setAttribute('vw-access-button', '');
        accessBar.classList.add('active');
        container.appendChild(accessBar);

        var pluginWrapper = document.createElement('div');
        pluginWrapper.setAttribute('vw-plugin-wrapper', '');

        var topWrapper = document.createElement('div');
        topWrapper.classList.add('vw-plugin-top-wrapper');
        pluginWrapper.appendChild(topWrapper);

        container.appendChild(pluginWrapper);
        document.body.appendChild(container);
    }

    /**
     * Carrega o script oficial do VLibras de forma assíncrona
     */
    function loadScript() {
        var script = document.createElement('script');
        script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
        script.async = true;
        script.onload = function () {
            if (typeof window.VLibras !== 'undefined') {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
            }
        };
        script.onerror = function () {
            console.warn('VLibras: Não foi possível carregar o plugin. Verifique sua conexão.');
        };
        document.head.appendChild(script);
    }

    /**
     * Inicializa o widget quando o DOM estiver pronto
     */
    function init() {
        injectStyles();
        createWidget();
        loadScript();
    }

    // Auto-inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
