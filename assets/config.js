/* Configuração do site. É o único arquivo que precisa mudar para ligar a lista e as redes.

   listEndpoint: '/api/lista' é o coletor do próprio site (functions/api/lista.js, servido pelo
                 worker/index.js no modo Worker), que recebe um POST com JSON
                 {"nome": "...", "email": "...", "origem": "/caminho/?utm_source=...", "site": ""}.
                 Vazio = formulário visível, mas desligado, com aviso honesto.
   youtubeUrl, instagramUrl: links do rodapé e o botão do canal no blog. Vazio = o link não aparece.
   fotoHero: caminho da foto do Matheus a partir da raiz do site (ex.: 'assets/matheus.png'),
             PNG ou WebP com fundo transparente, de frente, cara de quem acabou de conferir uma conta.
             Vazio = a abertura fica só com a conta e a página Sobre mostra "Foto em breve". */
var CONFIG = {
  listEndpoint: '/api/lista',
  youtubeUrl: 'https://www.youtube.com/@souzainvesteoficial',
  instagramUrl: '',
  fotoHero: 'assets/matheus.png'
};
