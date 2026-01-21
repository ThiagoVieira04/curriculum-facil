module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { nome, cargo, email, telefone, cidade, experiencia, formacao, habilidades, template = 'simples' } = req.body;

        // Validação
        if (!nome || !cargo || !email || !telefone || !cidade || !experiencia || !formacao || !habilidades) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        // Template simples
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white;">
                <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; color: #333; font-size: 28px;">${nome}</h1>
                        <h2 style="margin: 10px 0; color: #666; font-size: 20px; font-weight: normal;">${cargo}</h2>
                        <p style="margin: 10px 0; color: #666; font-size: 14px;">📧 ${email} | 📱 ${telefone} | 📍 ${cidade}</p>
                    </div>
                </div>
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">EXPERIÊNCIA PROFISSIONAL</h3>
                    <p style="text-align: justify;">${experiencia}</p>
                </div>
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">FORMAÇÃO</h3>
                    <p style="text-align: justify;">${formacao}</p>
                </div>
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">HABILIDADES</h3>
                    <p style="text-align: justify;">${habilidades}</p>
                </div>
            </div>
        `;

        const cvId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

        res.status(200).json({
            id: cvId,
            html: html,
            nome: nome,
            template: template,
            message: 'Currículo gerado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao gerar currículo:', error);
        res.status(500).json({ error: 'Erro ao gerar currículo', message: error.message });
    }
};
