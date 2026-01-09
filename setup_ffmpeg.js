const fs = require('fs');
const path = require('path');
const https = require('https');

// Define a pasta de destino: ./public/ffmpeg
const publicDir = path.join(__dirname, 'public');
const targetDir = path.join(publicDir, 'ffmpeg');

// Cria as pastas se não existirem
if (!fs.existsSync(publicDir)){
    fs.mkdirSync(publicDir);
}
if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir);
    console.log(`✅ Pasta criada: ${targetDir}`);
}

const files = [
    {
        name: 'ffmpeg-core.js',
        url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'
    },
    {
        name: 'ffmpeg-core.wasm',
        url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
    },
    {
        name: 'worker.js',
        url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/worker.js'
    }
];

console.log("🔥 Iniciando download dos motores de vídeo (FFmpeg)...");

files.forEach(file => {
    const filePath = path.join(targetDir, file.name);
    const fileStream = fs.createWriteStream(filePath);
    
    console.log(`⏳ Baixando ${file.name}...`);
    
    https.get(file.url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`❌ Falha ao baixar ${file.name}: Status ${response.statusCode}`);
            response.resume(); // Consumir resposta para liberar memória
            return;
        }

        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ ${file.name} salvo com sucesso!`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Apagar arquivo incompleto
        console.error(`❌ Erro de rede em ${file.name}: ${err.message}`);
    });
});
