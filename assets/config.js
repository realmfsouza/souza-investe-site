/* Configuração do site. É o único arquivo que precisa mudar para ligar a lista e as redes.

   listEndpoint: URL do provedor de e-mail que recebe um POST com JSON
                 {"nome": "...", "email": "...", "origem": "/caminho/da/pagina/"}.
                 Vazio = formulário visível, mas desligado, com aviso honesto.
   youtubeUrl, instagramUrl: links do rodapé. Vazio = o link não aparece. */
var CONFIG = {
  listEndpoint: '',
  youtubeUrl: 'https://www.youtube.com/@souzainvesteoficial',
  instagramUrl: ''
};
