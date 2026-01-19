// Estado da aplicação com validação
let currentStep = 'home';
let formData = {};
let photoFile = null;
let selectedTemplateId = 'simples';
let lastGeneratedCV = null;
let isSubmitting = false; // Previne duplo submit

// Configurações
const CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
    DEBOUNCE_DELAY: 1000,
    MAX_TEXT_LENGTH: 2000
};

// Definição dos modelos (Single Source of Truth)
const RESUME_TEMPLATES = [
    { id: 'simples', label: 'Simples' },
    { id: 'moderno', label: 'Moderno' },
    { id: 'executivo', label: 'Executivo' }
];

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    // Event listeners
    setupEventListeners();

    // Verificar se há dados salvos
    loadSavedData();
}

function setupEventListeners() {
    // Photo upload
    const photoInput = document.getElementById('photo');
    const photoUpload = document.querySelector('.photo-upload');

    if (photoInput && photoUpload) {
        photoInput.addEventListener('change', handlePhotoUpload);

        // Drag and drop
        photoUpload.addEventListener('dragover', handleDragOver);
        photoUpload.addEventListener('drop', handlePhotoDrop);
        photoUpload.addEventListener('click', () => photoInput.click());
    }

    // Form submission
    const form = document.getElementById('cv-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

// Navegação
function startCreation() {
    // Track evento
    if (typeof gtag !== 'undefined') {
        gtag('event', 'start_creation', {
            event_category: 'engagement',
            event_label: 'hero_button'
        });
    }
    showFormPage();
}

function showFormPage() {
    document.body.innerHTML = `
        <header>
            <nav>
                <div class="container">
                    <h1 onclick="goHome()">📄 CurrículoFácil</h1>
                    <div class="nav-links">
                        <button onclick="goHome()" style="background:none;border:none;color:#64748b;cursor:pointer;">← Voltar</button>
                    </div>
                </div>
            </nav>
        </header>

        <main style="padding-top: 100px;">
            <div class="container">
                <div class="form-container">
                    <h2 style="text-align:center;margin-bottom:1rem;color:#1e293b;">Criar Seu Currículo</h2>
                    
                    <!-- AdSense - Banner Formulário -->
                    <div class="ad-banner">
                        <ins class="adsbygoogle"
                             style="display:block"
                             data-ad-client="ca-pub-XXXXXXXXX"
                             data-ad-slot="XXXXXXXXX"
                             data-ad-format="auto"></ins>
                    </div>

                    <form id="cv-form">
                        <!-- Dados Pessoais -->
                        <div class="form-group">
                            <label for="nome">Nome Completo *</label>
                            <input type="text" id="nome" name="nome" required placeholder="Seu nome completo">
                        </div>

                        <div class="form-group">
                            <label for="cargo">Cargo Desejado *</label>
                            <input type="text" id="cargo" name="cargo" required placeholder="Ex: Analista de Marketing">
                        </div>

                        <div class="form-group">
                            <label for="email">E-mail *</label>
                            <input type="email" id="email" name="email" required placeholder="seu@email.com">
                        </div>

                        <div class="form-group">
                            <label for="telefone">Telefone *</label>
                            <input type="tel" id="telefone" name="telefone" required placeholder="(11) 99999-9999">
                        </div>

                        <div class="form-group">
                            <label for="cidade">Cidade *</label>
                            <input type="text" id="cidade" name="cidade" required placeholder="São Paulo, SP">
                        </div>

                        <!-- Dados Pessoais Opcionais -->
                        <div class="form-group">
                            <label for="nascimento">Data de Nascimento</label>
                            <input type="date" id="nascimento" name="nascimento" placeholder="DD/MM/AAAA">
                        </div>

                        <div class="form-group">
                            <label for="estadoCivil">Estado Civil</label>
                            <select id="estadoCivil" name="estadoCivil">
                                <option value="">Selecione</option>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viúvo(a)">Viúvo(a)</option>
                                <option value="União Estável">União Estável</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="naturalidade">Naturalidade</label>
                            <input type="text" id="naturalidade" name="naturalidade" placeholder="Ex: São Paulo, SP">
                        </div>

                        <div class="form-group">
                            <label for="nacionalidade">Nacionalidade</label>
                            <input type="text" id="nacionalidade" name="nacionalidade" placeholder="Ex: Brasileira">
                        </div>

                        <!-- Foto -->
                        <div class="form-group">
                            <label>Foto (Opcional)</label>
                            <div class="photo-upload" id="photo-upload">
                                <input type="file" id="photo" accept="image/jpeg,image/png" style="display:none;">
                                <div id="photo-placeholder">
                                    <p>📷 Clique ou arraste uma foto</p>
                                    <small>JPG ou PNG, máximo 5MB</small>
                                </div>
                                <img id="photo-preview" class="photo-preview hidden" alt="Preview da foto">
                            </div>
                        </div>

                        <!-- Objetivo -->
                        <div class="form-group">
                            <label for="objetivo">Objetivo Profissional</label>
                            <textarea id="objetivo" name="objetivo" placeholder="Descreva seu objetivo profissional..."></textarea>
                        </div>

                        <!-- Experiência Profissional -->
                        <div class="form-group">
                            <label>Experiência Profissional *</label>
                            
                            <div class="experience-item">
                                <input type="text" name="empresa1" placeholder="Empresa 1">
                                <input type="text" name="funcao1" placeholder="Função">
                                <input type="text" name="periodo1" placeholder="Período (Ex: Jan/2020 - Dez/2022)">
                            </div>
                            
                            <div class="experience-item">
                                <input type="text" name="empresa2" placeholder="Empresa 2 (opcional)">
                                <input type="text" name="funcao2" placeholder="Função">
                                <input type="text" name="periodo2" placeholder="Período">
                            </div>
                            
                            <div class="experience-item">
                                <input type="text" name="empresa3" placeholder="Empresa 3 (opcional)">
                                <input type="text" name="funcao3" placeholder="Função">
                                <input type="text" name="periodo3" placeholder="Período">
                            </div>
                            
                            <textarea id="experiencia" name="experiencia" required placeholder="Descreva suas principais atividades e conquistas..."></textarea>
                        </div>

                        <!-- Formação -->
                        <div class="form-group">
                            <label for="formacao">Formação *</label>
                            <textarea id="formacao" name="formacao" required placeholder="Sua formação acadêmica..."></textarea>
                        </div>

                        <!-- Cursos -->
                        <div class="form-group">
                            <label for="cursos">Cursos e Certificações</label>
                            <textarea id="cursos" name="cursos" placeholder="Liste seus cursos, certificações e qualificações..."></textarea>
                        </div>

                        <!-- Habilidades -->
                        <div class="form-group">
                            <label for="habilidades">Habilidades *</label>
                            <textarea id="habilidades" name="habilidades" required placeholder="Liste suas principais habilidades..."></textarea>
                        </div>

                        <!-- Template -->
                        <div class="form-group">
                            <label for="template">Modelo do Currículo</label>
                            <select id="template" name="template">
                                ${RESUME_TEMPLATES.map(t => `
                                    <option value="${t.id}" ${t.id === selectedTemplateId ? 'selected' : ''}>
                                        ${t.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <button type="submit" class="cta-button" style="width:100%;margin-top:2rem;">
                            🤖 Gerar Currículo com IA
                        </button>
                    </form>
                </div>
            </div>
        </main>
    `;

    // Aguardar DOM ser criado antes de configurar listeners
    setTimeout(() => {
        setupEventListeners();
        loadSavedData();
    }, 0);

    // Carregar AdSense
    if (window.adsbygoogle) {
        (adsbygoogle = window.adsbygoogle || []).push({});
    }
}

function goHome() {
    location.reload();
}

// Upload de foto
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    processPhoto(file);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handlePhotoDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processPhoto(file);
    }
}

function processPhoto(file) {
    if (!file) return;

    // Validação de tamanho
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showError(`Arquivo muito grande. Máximo ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB.`);
        return;
    }

    // Validação de tipo
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showError('Apenas arquivos JPG e PNG são aceitos.');
        return;
    }

    // Validação adicional do nome do arquivo
    const fileName = file.name.toLowerCase();
    if (!fileName.match(/\.(jpg|jpeg|png)$/)) {
        showError('Extensão de arquivo inválida.');
        return;
    }

    photoFile = file;

    // Preview com tratamento de erro
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');

            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                placeholder.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro no preview da foto:', error);
            showError('Erro ao processar a imagem.');
        }
    };

    reader.onerror = function () {
        showError('Erro ao ler o arquivo de imagem.');
    };

    reader.readAsDataURL(file);
}

// Submissão do formulário com validação robusta
async function handleFormSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return; // Previne duplo submit
    }

    const button = event.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;

    // Validação do lado cliente
    const formData = new FormData(event.target);
    const validationError = validateFormData(formData);
    if (validationError) {
        showError(validationError);
        return;
    }

    isSubmitting = true;
    button.textContent = '⏳ Gerando...';
    button.disabled = true;

    try {
        // Adicionar foto se houver
        if (photoFile) {
            formData.append('photo', photoFile);
        }

        // Timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch('/api/generate-cv', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const rawText = await response.text();
            let errorMsg = 'Erro desconhecido';

            try {
                const errorData = JSON.parse(rawText);

                // Trata erro se for objeto (comum no Vercel/Node)
                if (errorData.error && typeof errorData.error === 'object') {
                    errorMsg = errorData.error.message || JSON.stringify(errorData.error);
                } else {
                    errorMsg = errorData.error || errorData.message || `Erro ${response.status}`;
                }

                // Adiciona detalhes técnicos se houver (para debug)
                if (errorData.details) {
                    errorMsg += ` (${errorData.details})`;
                }

                // Adiciona dica se houver
                if (errorData.tip) {
                    errorMsg += `. ${errorData.tip}`;
                }
            } catch (e) {
                // Se não for JSON, usa o texto puro (limitado a 200 chars para não poluir alerta)
                // Geralmente isso acontece quando estouramos limite de memória ou erro fatal do Node
                console.error('Resposta não-JSON do servidor:', rawText);
                errorMsg = `Erro ${response.status}: ${rawText.substring(0, 200)}`;
            }

            throw new Error(errorMsg);
        }

        const result = await response.json();
        lastGeneratedCV = result;
        showPreview(result);

        // Analytics
        trackEvent('cv_generated', {
            template: result.template || 'simples',
            has_photo: !!photoFile
        });

    } catch (error) {
        console.error('Erro ao gerar currículo:', error);

        let errorMessage = 'Erro ao gerar currículo. Tente novamente.';
        if (error.name === 'AbortError') {
            errorMessage = 'Tempo limite excedido. Tente novamente.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showError(errorMessage);
    } finally {
        isSubmitting = false;
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Preview do currículo
function showPreview(data) {
    document.body.innerHTML = `
        <header>
            <nav>
                <div class="container">
                    <h1 onclick="goHome()">📄 CurrículoFácil</h1>
                    <div class="nav-links">
                        <button onclick="goHome()" style="background:none;border:none;color:#64748b;cursor:pointer;">← Nova Criação</button>
                    </div>
                </div>
            </nav>
        </header>

        <main style="padding-top: 100px;">
            <div class="container">
                <!-- AdSense - Banner Preview -->
                <div class="ad-banner">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-XXXXXXXXX"
                         data-ad-slot="XXXXXXXXX"
                         data-ad-format="auto"></ins>
                </div>

                <div class="preview-container">
                    <h2 style="text-align:center;margin-bottom:2rem;color:#1e293b;">Seu Currículo Está Pronto!</h2>
                    
                    ${data.warnings && data.warnings.length > 0 ? `
                        <div style="background:#fff7ed;color:#9a3412;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid #fdba74;">
                            <strong>⚠️ Atenção:</strong><br>
                            ${data.warnings.map(w => `• ${w}<br>`).join('')}
                        </div>
                    ` : ''}

                    <div class="cv-preview" id="cv-preview">
                        ${data.html}
                    </div>
                    
                    <div style="text-align:center;margin-top:2rem;">
                        <button onclick="downloadPDF('${data.id}')" class="cta-button" style="margin-right:1rem;">
                            📥 Baixar PDF
                        </button>
                        <button onclick="shareCV('${data.id}')" class="cta-button" style="background:#6366f1;">
                            🔗 Compartilhar
                        </button>
                    </div>
                </div>

                <!-- Afiliados - Pós Criação -->
                <div class="affiliate-section" style="margin-top:3rem;">
                    <div class="container">
                        <h3>🚀 Próximos Passos para sua Carreira</h3>
                        <div class="affiliate-grid">
                            <a href="https://vagas.com.br" target="_blank" rel="nofollow" class="affiliate-card">
                                <h4>💼 Vagas.com</h4>
                                <p>Encontre oportunidades</p>
                            </a>
                            <a href="https://linkedin.com/learning" target="_blank" rel="nofollow" class="affiliate-card">
                                <h4>📚 LinkedIn Learning</h4>
                                <p>Desenvolva habilidades</p>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;

    // Carregar AdSense
    if (window.adsbygoogle) {
        (adsbygoogle = window.adsbygoogle || []).push({});
    }
}

// Download PDF com retry e melhor tratamento de erro
async function downloadPDF(cvId, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
        const requestData = {
            html: lastGeneratedCV ? lastGeneratedCV.html : document.getElementById('cv-preview')?.innerHTML,
            nome: lastGeneratedCV ? lastGeneratedCV.nome : 'meu-curriculo'
        };

        if (!requestData.html) {
            throw new Error('Conteúdo do currículo não encontrado. Gere o currículo novamente.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos

        const response = await fetch(`/api/download-pdf/${cvId || 'direct'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf, application/json'
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            const detailMsg = errorData.details ? ` (${errorData.details})` : '';
            throw new Error((errorData.error || `Erro ${response.status}`) + detailMsg);
        }

        const blob = await response.blob();

        if (blob.size === 0) {
            throw new Error('PDF gerado está vazio');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Nome do arquivo
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'curriculo.pdf';
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        trackEvent('pdf_downloaded', { filename });

    } catch (error) {
        console.error('Erro no download:', error);

        if (error.name === 'AbortError') {
            showError('Tempo limite excedido. O PDF pode estar sendo gerado, tente novamente.');
        } else if (retryCount < MAX_RETRIES) {
            console.log(`Tentativa ${retryCount + 1} de ${MAX_RETRIES + 1}`);
            setTimeout(() => downloadPDF(cvId, retryCount + 1), 2000);
            return;
        } else {
            // Se houver detalhes extras na mensagem de erro, mostra também
            const detailedError = error.message;
            showError(`Erro ao baixar PDF: ${detailedError}`);
            console.error('Detalhes técnicos do erro:', detailedError);
        }
    }
}

// Compartilhar currículo
function shareCV(cvId) {
    const url = `${window.location.origin}/cv/${cvId}`;

    if (navigator.share) {
        navigator.share({
            title: 'Meu Currículo',
            url: url
        });
    } else {
        // Fallback - copiar para clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copiado para a área de transferência!');
        });
    }
}

// Salvar dados localmente
function saveFormData() {
    const form = document.getElementById('cv-form');
    if (form) {
        const data = new FormData(form);
        const obj = {};
        for (let [key, value] of data.entries()) {
            obj[key] = value;
        }
        localStorage.setItem('cv-form-data', JSON.stringify(obj));
    }
}

// Carregar dados salvos
function loadSavedData() {
    const saved = localStorage.getItem('cv-form-data');
    if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.value = data[key];
            }
        });
    }
}

// Auto-save durante digitação
document.addEventListener('input', debounce(saveFormData, 1000));

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Template Preview Modal
function showTemplatePreview(templateType) {
    selectedTemplateId = templateType; // Sincroniza seleção atual
    const templates = {
        simples: (data) => `
            <div style="font-family: Arial, sans-serif; width: 100%; max-width: 750px; margin: 0 auto; padding: 20px; line-height: 1.6; border: 1px solid #ddd; background: white; box-sizing: border-box; overflow-x: hidden;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 30px; flex-wrap: wrap;">
                    <div style="width: 60px; height: 80px; background: #eee; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 30px;">👤</div>
                    <div style="text-align: left;">
                        <h1 style="margin: 0; color: #333; font-size: 32px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">MARIA SILVA SANTOS</h1>
                        <h2 style="margin: 5px 0; color: #666; font-size: 16px; font-weight: normal;">Analista de Marketing Digital</h2>
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">
                            📧 maria.santos@email.com | 📱 (11) 99999-8888 | 📍 São Paulo, SP
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px;">EXPERIÊNCIA PROFISSIONAL</h3>
                    <p style="font-size: 12px; text-align: justify;">Atuo há 3 anos na área de marketing digital, com experiência em gestão de campanhas no Google Ads e Facebook Ads.</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px;">FORMAÇÃO</h3>
                    <p style="font-size: 12px;">Graduação em Marketing pela Universidade Mackenzie (2019-2022).</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px;">HABILIDADES</h3>
                    <p style="font-size: 12px; text-align: justify;">Google Ads, Facebook Ads, Analytics, SEO, Copywriting.</p>
                </div>

                <!-- Rodapé com nome -->
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #888; font-size: 10px;">
                    MARIA SILVA SANTOS
                </div>
                
                <!-- Assinatura -->
                <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #aaa; opacity: 0.7;">
                    Desenvolvido por Papel e Sonhos Informática
                </div>
            </div>
        `,

        moderno: (data) => `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 100%; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; border: 1px solid #ddd; background: white; box-sizing: border-box; overflow-x: hidden;">
                <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 20px; display: flex; align-items: center; gap: 20px; margin-bottom: 25px; flex-wrap: wrap;">
                    <div style="width: 60px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 3px; border: 3px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; font-size: 30px;">👤</div>
                    <div style="text-align: left;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">MARIA SILVA SANTOS</h1>
                        <h2 style="margin: 5px 0; font-size: 16px; font-weight: normal; opacity: 0.9;">Analista de Marketing Digital</h2>
                        <p style="margin: 5px 0; font-size: 12px; opacity: 0.9;">
                            📧 maria.santos@email.com | 📱 (11) 99999-8888 | 📍 São Paulo, SP
                        </p>
                    </div>
                </div>
                
                <div style="padding: 0 20px 20px 20px;">
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">EXPERIÊNCIA PROFISSIONAL</h3>
                        <p style="font-size: 12px; text-align: justify;">Atuo há 3 anos na área de marketing digital, com experiência em gestão de campanhas no Google Ads e Facebook Ads.</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">FORMAÇÃO</h3>
                        <p style="font-size: 12px;">Graduação em Marketing pela Universidade Mackenzie (2019-2022).</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">HABILIDADES</h3>
                        <p style="font-size: 12px; text-align: justify;">Google Ads, Facebook Ads, Analytics, SEO, Copywriting.</p>
                    </div>
                    
                    <!-- Rodapé com nome -->
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #888; font-size: 10px;">
                        MARIA SILVA SANTOS
                    </div>
                    
                    <!-- Assinatura -->
                    <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #aaa; opacity: 0.7;">
                        Desenvolvido por Papel e Sonhos Informática
                    </div>
                </div>
            </div>
        `,

        executivo: (data) => `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; width: 100%; max-width: 750px; margin: 0 auto; background: white; display: flex; box-shadow: 0 0 10px rgba(0,0,0,0.1); border: 1px solid #ddd; min-height: 800px;">
                <!-- Coluna Lateral (Esquerda) -->
                <div style="width: 30%; background-color: #2c3e50; color: white; padding: 20px 15px; text-align: center;">
                    <div style="width: 60px; height: 80px; margin: 0 auto 20px; border-radius: 3px; border: 3px solid #34495e; background: #ecf0f1; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #2c3e50;">👤</div>
                    
                    <div style="text-align: left; margin-top: 20px;">
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #ecf0f1; border-bottom: 1px solid #7f8c8d; padding-bottom: 5px; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Contato</h3>
                            <p style="font-size: 10px; margin: 3px 0; color: #bdc3c7;">📧 maria.santos@email.com</p>
                            <p style="font-size: 10px; margin: 3px 0; color: #bdc3c7;">📱 (11) 99999-8888</p>
                            <p style="font-size: 10px; margin: 3px 0; color: #bdc3c7;">📍 São Paulo, SP</p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #ecf0f1; border-bottom: 1px solid #7f8c8d; padding-bottom: 5px; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Habilidades</h3>
                            <p style="font-size: 10px; color: #bdc3c7; line-height: 1.4;">Google Ads, Facebook Ads, Analytics, SEO, Copywriting.</p>
                        </div>
                    </div>
                </div>

                <!-- Coluna Principal (Direita) -->
                <div style="width: 70%; padding: 25px;">
                    <div style="margin-bottom: 25px; border-bottom: 2px solid #2c3e50; padding-bottom: 15px;">
                        <h1 style="margin: 0; color: #2c3e50; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">MARIA SILVA SANTOS</h1>
                        <h2 style="margin: 5px 0 0; color: #7f8c8d; font-size: 14px; font-weight: 300;">Analista de Marketing Digital</h2>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <span style="background: #2c3e50; color: white; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; font-size: 9px;">💼</span>
                            Experiência
                        </h3>
                        <p style="color: #34495e; font-size: 10px; text-align: justify; line-height: 1.4;">Atuo há 3 anos na área de marketing digital, com experiência em gestão de campanhas...</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <span style="background: #2c3e50; color: white; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; font-size: 9px;">🎓</span>
                            Formação
                        </h3>
                        <p style="color: #34495e; font-size: 10px; text-align: justify;">Graduação em Marketing pela Universidade Mackenzie (2019-2022).</p>
                    </div>
                    
                    <!-- Assinatura -->
                    <div style="text-align: center; font-size: 7px; color: #aaa; opacity: 0.7; margin-top: 15px;">
                        Desenvolvido por Papel e Sonhos Informática
                    </div>
                </div>
            </div>
        `,

        criativo: (data) => `
            <div style="font-family: 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; border: 1px solid #ddd; background: white; box-sizing: border-box; overflow-x: hidden;">
                <div style="background: #1e293b; color: white; padding: 20px; display: flex; align-items: center; gap: 20px; margin-bottom: 25px; flex-wrap: wrap;">
                    <div style="width: 60px; height: 80px; background: #334155; border: 3px solid #38bdf8; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 30px;">👤</div>
                    <div style="text-align: left;">
                        <h1 style="margin: 0; color: #38bdf8; font-size: 32px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">MARIA SILVA SANTOS</h1>
                        <h2 style="margin: 5px 0; color: white; font-size: 16px; font-weight: normal; opacity: 0.9;">Analista de Marketing Digital</h2>
                        <p style="margin: 5px 0; color: white; font-size: 12px; opacity: 0.8;">
                            📧 maria.santos@email.com | 📱 (11) 99999-8888 | 📍 São Paulo, SP
                        </p>
                    </div>
                </div>
                
                <div style="padding: 0 25px 25px 25px;">
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 14px; text-transform: uppercase;">EXPERIÊNCIA PROFISSIONAL</h3>
                        <p style="font-size: 12px; color: #334155; text-align: justify;">Atuo há 3 anos na área de marketing digital...</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 14px; text-transform: uppercase;">FORMAÇÃO</h3>
                        <p style="font-size: 12px; color: #334155; text-align: justify;">Graduação em Marketing pela Universidade Mackenzie (2019-2022).</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 14px; text-transform: uppercase;">HABILIDADES</h3>
                        <p style="font-size: 12px; color: #334155; text-align: justify;">Google Ads, Facebook Ads, Analytics, SEO, Copywriting.</p>
                    </div>
                    
                    <!-- Rodapé com nome -->
                    <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: right; font-style: italic; color: #94a3b8; font-size: 10px;">
                        MARIA SILVA SANTOS
                    </div>
                    
                    <!-- Assinatura -->
                    <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #aaa; opacity: 0.7;">
                        Desenvolvido por Papel e Sonhos Informática
                    </div>
                </div>
            </div>
        `,

        elegante: (data) => `
            <div style="font-family: Georgia, serif; width: 100%; max-width: 750px; margin: 0 auto; padding: 20px; line-height: 1.6; border: 1px solid #ddd; background: white; color: #2c3e50; box-sizing: border-box; overflow-x: hidden;">
                <div style="display: flex; align-items: center; gap: 25px; margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 25px; flex-wrap: wrap;">
                    <div style="width: 60px; height: 80px; background: #fdfdfd; border: 1px solid #eee; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 30px; filter: grayscale(100%);">👤</div>
                    <div style="text-align: left; flex: 1;">
                        <h1 style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: normal; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">MARIA SILVA SANTOS</h1>
                        <h2 style="margin: 5px 0; color: #7f8c8d; font-size: 16px; font-weight: normal; font-style: italic;">Analista de Marketing Digital</h2>
                        <p style="margin: 5px 0; color: #7f8c8d; font-size: 12px;">
                            📧 maria.santos@email.com | 📱 (11) 99999-8888 | 📍 São Paulo, SP
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #2c3e50; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">EXPERIÊNCIA PROFISSIONAL</h3>
                    <p style="font-size: 12px; line-height: 1.6; text-align: justify;">Atuo há 3 anos na área de marketing digital...</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #2c3e50; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">FORMAÇÃO</h3>
                    <p style="font-size: 12px; line-height: 1.6; text-align: justify;">Graduação em Marketing pela Universidade Mackenzie (2019-2022).</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #2c3e50; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">HABILIDADES</h3>
                    <p style="font-size: 12px; line-height: 1.6; text-align: justify;">Google Ads, Facebook Ads, Analytics, SEO, Copywriting.</p>
                </div>
                
                <!-- Rodapé com nome -->
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #95a5a6; font-size: 10px;">
                    MARIA SILVA SANTOS
                </div>
                
                <!-- Assinatura -->
                <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #aaa; opacity: 0.7;">
                    Desenvolvido por Papel e Sonhos Informática
                </div>
            </div>
        `
    };

    const modal = document.getElementById('template-modal');
    const content = document.getElementById('modal-template-content');

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: #333;">Modelo ${templateType.charAt(0).toUpperCase() + templateType.slice(1)}</h2>
        ${templates[templateType]}
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevenir scroll
}

function closeTemplatePreview() {
    const modal = document.getElementById('template-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restaurar scroll
}

// Fechar modal ao clicar fora
window.onclick = function (event) {
    const modal = document.getElementById('template-modal');
    if (event.target === modal) {
        closeTemplatePreview();
    }
}
// Validação do formulário
function validateFormData(formData) {
    const requiredFields = {
        nome: 'Nome completo',
        cargo: 'Cargo desejado',
        email: 'E-mail',
        telefone: 'Telefone',
        cidade: 'Cidade',
        experiencia: 'Experiência profissional',
        formacao: 'Formação',
        habilidades: 'Habilidades'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
        const value = formData.get(field);
        if (!value || value.trim().length < 2) {
            return `${label} é obrigatório e deve ter pelo menos 2 caracteres`;
        }
        if (value.length > CONFIG.MAX_TEXT_LENGTH) {
            return `${label} deve ter no máximo ${CONFIG.MAX_TEXT_LENGTH} caracteres`;
        }
    }

    // Validar email
    const email = formData.get('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'E-mail inválido';
    }

    // Validar telefone
    const telefone = formData.get('telefone');
    const phoneRegex = /^[\d\s\(\)\-\+]{8,20}$/;
    if (!phoneRegex.test(telefone)) {
        return 'Telefone inválido';
    }

    return null;
}

// Mostrar erro
function showError(message) {
    // Remove alertas anteriores
    const existingAlert = document.querySelector('.error-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = 'error-alert';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-size: 14px;
        line-height: 1.4;
    `;
    alert.textContent = message;

    document.body.appendChild(alert);

    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Analytics helper
function trackEvent(eventName, parameters = {}) {
    try {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'engagement',
                ...parameters
            });
        }
    } catch (error) {
        console.warn('Analytics error:', error);
    }
}