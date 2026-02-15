// Acessibilidade: Gerenciamento de Modais
class ModalAccessibility {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.focusableElements = null;
        this.firstFocusable = null;
        this.lastFocusable = null;
        this.previouslyFocused = null;
    }

    open() {
        if (!this.modal) return;

        // Salvar elemento com foco anterior
        this.previouslyFocused = document.activeElement;

        // Mostrar modal
        this.modal.style.display = 'block';
        this.modal.setAttribute('aria-hidden', 'false');

        // Obter elementos focáveis
        this.focusableElements = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (this.focusableElements.length > 0) {
            this.firstFocusable = this.focusableElements[0];
            this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

            // Focar primeiro elemento
            this.firstFocusable.focus();
        }

        // Adicionar trap de foco
        this.modal.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Prevenir scroll do body
        document.body.style.overflow = 'hidden';
    }

    close() {
        if (!this.modal) return;

        // Esconder modal
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');

        // Restaurar foco
        if (this.previouslyFocused) {
            this.previouslyFocused.focus();
        }

        // Remover trap de foco
        this.modal.removeEventListener('keydown', this.handleKeyDown.bind(this));

        // Restaurar scroll do body
        document.body.style.overflow = '';
    }

    handleKeyDown(e) {
        // ESC fecha modal
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        // TAB trap de foco
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === this.firstFocusable) {
                    e.preventDefault();
                    this.lastFocusable.focus();
                }
            } else {
                // Tab
                if (document.activeElement === this.lastFocusable) {
                    e.preventDefault();
                    this.firstFocusable.focus();
                }
            }
        }
    }
}

// Instâncias dos modais
const templateModal = new ModalAccessibility('template-modal');
const atsModal = new ModalAccessibility('ats-modal');

// Funções globais para compatibilidade
window.showTemplatePreview = function(templateType) {
    templateModal.open();
    // Lógica existente de preview...
};

window.closeTemplatePreview = function() {
    templateModal.close();
};

window.closeATSModal = function() {
    atsModal.close();
};

// Anunciar conteúdo dinâmico para leitores de tela
window.announceToScreenReader = function(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
};

// Melhorar navegação por teclado em cards clicáveis
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar suporte a Enter/Space em elementos clicáveis
    const clickableElements = document.querySelectorAll('[onclick]');
    
    clickableElements.forEach(element => {
        if (element.tagName !== 'BUTTON' && element.tagName !== 'A') {
            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
            
            // Tornar focável se não for
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
        }
    });
});
