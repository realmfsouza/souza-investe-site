/* Configuração do site. É o único arquivo que precisa mudar para ligar a lista e as redes.

   listEndpoint: URL do provedor de e-mail que recebe um POST com JSON
                 {"nome": "...", "email": "...", "origem": "/caminho/da/pagina/"}.
                 Vazio = formulário visível, mas desligado, com aviso honesto.
   youtubeUrl, instagramUrl: links do rodapé e o botão do canal no blog. Vazio = o link não aparece.
   fotoHero: caminho da foto do Matheus a partir da raiz do site (ex.: 'assets/matheus.png'),
             PNG ou WebP com fundo transparente, de frente, cara de quem acabou de conferir uma conta.
             Vazio = a abertura fica só com a conta e a página Sobre mostra "Foto em breve". */
var CONFIG = {
  listEndpoint: '',
  youtubeUrl: 'https://www.youtube.com/@souzainvesteoficial',
  instagramUrl: '',
  fotoHero: ''
};
