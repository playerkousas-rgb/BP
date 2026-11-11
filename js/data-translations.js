// B-P Atlas v1.2 · © SCOUT SYSTEM
// In-memory display translations only: the sourced JSON remains unchanged.
// Order: Japanese, Korean, French, Spanish, Indonesian, Portuguese, Hindi.
import { extraLanguages } from './translations.js';
const journey = {
  'london-birth': [
    ['物語の始まり', 'ロバート・ベーデン＝パウエルは1857年2月22日にロンドンで生まれました。10人きょうだいの8番目でした。'],
    ['이야기의 시작', '로버트 베이든포월은 1857년 2월 22일 런던에서 열 자녀 중 여덟째로 태어났습니다.'],
    ['Le début de l’histoire', 'Robert Baden-Powell naît à Londres le 22 février 1857, huitième de dix enfants.'],
    ['Donde comienza la historia', 'Robert Baden-Powell nació en Londres el 22 de febrero de 1857, octavo de diez hijos.'],
    ['Awal sebuah kisah', 'Robert Baden-Powell lahir di London pada 22 Februari 1857, anak kedelapan dari sepuluh bersaudara.'],
    ['Onde a história começa', 'Robert Baden-Powell nasceu em Londres em 22 de fevereiro de 1857, o oitavo de dez filhos.'],
    ['कहानी की शुरुआत', 'रॉबर्ट बेडेन-पॉवेल का जन्म 22 फ़रवरी 1857 को लंदन में हुआ। वे दस बच्चों में आठवें थे।'],
  ],
  charterhouse: [
    ['自然にひかれた少年', 'ベーデン＝パウエルは奨学金を得てチャーターハウス校に入学しました。在学中に学校はゴダルミングに移り、彼は近くの森を探検しました。'],
    ['자연에 이끌린 소년', '베이든포월은 장학금을 받아 차터하우스 학교에 입학했습니다. 재학 중 학교가 고달밍으로 이전했고 그는 근처 숲을 탐험했습니다.'],
    ['Un garçon attiré par la nature', 'Baden-Powell obtient une bourse pour Charterhouse. L’école déménage à Godalming pendant sa scolarité et il explore les bois voisins.'],
    ['Un joven atraído por la naturaleza', 'Baden-Powell obtuvo una beca para Charterhouse. Durante sus estudios la escuela se trasladó a Godalming, donde exploró los bosques cercanos.'],
    ['Anak yang tertarik pada alam', 'Baden-Powell memperoleh beasiswa ke Charterhouse. Sekolah pindah ke Godalming saat ia belajar di sana, dan ia menjelajahi hutan di dekatnya.'],
    ['Um jovem atraído pela natureza', 'Baden-Powell ganhou uma bolsa para Charterhouse. A escola mudou-se para Godalming durante seus estudos, onde ele explorou os bosques próximos.'],
    ['प्रकृति की ओर आकर्षित बालक', 'बेडेन-पॉवेल को चार्टरहाउस में छात्रवृत्ति मिली। उनकी पढ़ाई के दौरान स्कूल गोडलमिंग चला गया, जहाँ उन्होंने पास के जंगल खोजे।'],
  ],
  lucknow: [
    ['インドの若い将校', '卒業後に軍に入り、インドへ渡りました。軍務の中で観察、斥候、地図作成の技術を磨きました。'],
    ['인도의 젊은 장교', '학교를 마친 뒤 군에 입대해 인도로 갔습니다. 군 복무 중 관찰, 정찰, 지도 제작 기술을 발전시켰습니다.'],
    ['Un jeune officier en Inde', 'Après l’école, il rejoint l’armée et part en Inde. Durant son service, il développe ses compétences en observation, reconnaissance et cartographie.'],
    ['Un joven oficial en la India', 'Tras la escuela ingresó en el ejército y viajó a la India. Durante su servicio desarrolló habilidades de observación, exploración y cartografía.'],
    ['Perwira muda di India', 'Setelah sekolah, ia bergabung dengan tentara dan pergi ke India. Selama dinasnya ia mengembangkan kemampuan observasi, pengintaian, dan pemetaan.'],
    ['Um jovem oficial na Índia', 'Após a escola, ingressou no exército e foi à Índia. Durante o serviço desenvolveu habilidades de observação, reconhecimento e cartografia.'],
    ['भारत में युवा अधिकारी', 'स्कूल के बाद वे सेना में भर्ती होकर भारत गए। सैन्य सेवा में उन्होंने निरीक्षण, टोही और मानचित्र बनाने के कौशल विकसित किए।'],
  ],
  natal: [
    ['アフリカ南部への赴任', '1880年代の軍務でアフリカ南部に赴きました。ここでは参考地点としてナタールのダーバンを示しています。'],
    ['남부 아프리카 근무', '1880년대 군 복무로 아프리카 남부에 갔습니다. 여기서는 나탈의 더반을 예시 장소로 사용합니다.'],
    ['Une affectation en Afrique australe', 'Dans les années 1880, son service militaire le conduit en Afrique australe. Durban, au Natal, sert ici de lieu indicatif.'],
    ['Un destino en el sur de África', 'En la década de 1880, su servicio militar lo llevó al sur de África. Durban, en Natal, se usa aquí como lugar ilustrativo.'],
    ['Penugasan di Afrika bagian selatan', 'Pada 1880-an, dinas militernya membawanya ke Afrika bagian selatan. Durban di Natal digunakan di sini sebagai lokasi ilustratif.'],
    ['Uma missão no sul da África', 'Na década de 1880, seu serviço militar o levou ao sul da África. Durban, em Natal, é usado aqui como local ilustrativo.'],
    ['दक्षिणी अफ्रीका में तैनाती', '1880 के दशक में सैन्य सेवा उन्हें दक्षिणी अफ्रीका ले गई। यहाँ नटाल का डरबन संकेतात्मक स्थान के रूप में दिखाया गया है।'],
  ],
  malta: [
    ['地中海での日々', 'ベーデン＝パウエルはマルタに赴任し、この時期に地中海地域を旅しました。'],
    ['지중해에서 보낸 시기', '베이든포월은 몰타에 배치되었고 이 시기에 지중해 지역을 여행했습니다.'],
    ['Des années en Méditerranée', 'Baden-Powell est affecté à Malte et voyage dans la région méditerranéenne durant ces années.'],
    ['Años en el Mediterráneo', 'Baden-Powell fue destinado a Malta y viajó por la región mediterránea durante esos años.'],
    ['Tahun-tahun di Mediterania', 'Baden-Powell ditempatkan di Malta dan melakukan perjalanan di kawasan Mediterania pada tahun-tahun ini.'],
    ['Anos no Mediterrâneo', 'Baden-Powell foi designado para Malta e viajou pela região mediterrânea nesses anos.'],
    ['भूमध्य सागर के वर्ष', 'बेडेन-पॉवेल माल्टा में तैनात रहे और इन वर्षों में भूमध्य क्षेत्र की यात्रा की।'],
  ],
  kumasi: [
    ['西アフリカにて', '1890年代の軍務では西アフリカにも赴きました。この地点の時期と場所は伝記資料で補っています。'],
    ['서아프리카에서', '1890년대 군 복무로 서아프리카에도 갔습니다. 이 지점의 시기와 장소는 전기 자료로 보완했습니다.'],
    ['En Afrique de l’Ouest', 'Son service militaire le conduit aussi en Afrique de l’Ouest dans les années 1890. La date et le lieu de cette étape sont complétés par des sources biographiques.'],
    ['En África occidental', 'Su servicio militar también lo llevó a África occidental en la década de 1890. La fecha y el lugar de esta parada se complementan con fuentes biográficas.'],
    ['Di Afrika Barat', 'Dinas militernya juga membawanya ke Afrika Barat pada 1890-an. Waktu dan lokasi perhentian ini dilengkapi dari sumber biografi.'],
    ['Na África Ocidental', 'Seu serviço militar também o levou à África Ocidental na década de 1890. A época e o local desta parada foram complementados por fontes biográficas.'],
    ['पश्चिम अफ्रीका में', '1890 के दशक में सैन्य सेवा उन्हें पश्चिम अफ्रीका भी ले गई। इस पड़ाव का समय और स्थान जीवनी स्रोतों से पूरक हैं।'],
  ],
  mafeking: [
    ['マフェキング', 'マフェキング包囲戦の間、町を支えた少年たちの機転と勇気に感銘を受けました。'],
    ['마페킹', '마페킹 포위전 동안 마을을 도운 소년들의 기지와 용기에 깊은 인상을 받았습니다.'],
    ['Mafeking', 'Pendant le siège de Mafeking, il est frappé par l’ingéniosité et le courage des garçons qui aident dans la ville.'],
    ['Mafeking', 'Durante el asedio de Mafeking le impresionaron el ingenio y el valor de los muchachos que ayudaban en la ciudad.'],
    ['Mafeking', 'Selama pengepungan Mafeking, ia terkesan oleh kecerdikan dan keberanian anak-anak yang membantu di kota itu.'],
    ['Mafeking', 'Durante o cerco de Mafeking, impressionou-se com a iniciativa e a coragem dos meninos que ajudavam na cidade.'],
    ['माफ़ेकिंग', 'माफ़ेकिंग की घेराबंदी के दौरान नगर में सहायता करने वाले लड़कों की सूझबूझ और साहस ने उन्हें प्रभावित किया।'],
  ],
  'london-return': [
    ['思いがけない発見', '英国へ戻ると、兵士のために書いた斥候の手引きが青少年指導者や少年たちにも読まれていることを知りました。'],
    ['뜻밖의 발견', '영국으로 돌아온 그는 군인을 위해 쓴 정찰 교본이 청소년 지도자와 소년들에게도 읽히고 있음을 알게 되었습니다.'],
    ['Une découverte inattendue', 'De retour en Grande-Bretagne, il découvre qu’un manuel de reconnaissance écrit pour les soldats est aussi lu par des responsables de jeunesse et des garçons.'],
    ['Un descubrimiento inesperado', 'Al volver a Gran Bretaña descubrió que un manual de exploración escrito para soldados también era leído por líderes juveniles y muchachos.'],
    ['Penemuan tak terduga', 'Sekembalinya ke Inggris, ia mengetahui bahwa buku panduan pengintaian yang ditulisnya untuk tentara juga dibaca oleh pemimpin pemuda dan anak laki-laki.'],
    ['Uma descoberta inesperada', 'Ao voltar à Grã-Bretanha, descobriu que um manual de reconhecimento escrito para soldados também era lido por líderes juvenis e meninos.'],
    ['एक अनपेक्षित खोज', 'ब्रिटेन लौटने पर उन्हें पता चला कि सैनिकों के लिए लिखी उनकी टोही पुस्तिका युवा नेता और लड़के भी पढ़ रहे थे।'],
  ],
  brownsea: [
    ['一つのキャンプから始まった', '1907年、ベーデン＝パウエルは20人の少年をブラウンシー島の実験キャンプに集めました。現在 WOSM は20人とし、古い記録には22人との記述もあります。'],
    ['하나의 야영, 시작', '1907년 베이든포월은 소년 20명을 브라운시섬의 실험 야영에 데려갔습니다. 현재 WOSM은 20명으로 밝히며 일부 과거 기록은 22명이라고 합니다.'],
    ['Un camp, un commencement', 'En 1907, Baden-Powell réunit 20 garçons pour un camp expérimental sur l’île de Brownsea. La WOSM indique aujourd’hui 20 ; certains récits anciens disent 22.'],
    ['Un campamento, un comienzo', 'En 1907, Baden-Powell reunió a 20 muchachos en un campamento experimental en la isla de Brownsea. La OMMS indica ahora 20; algunos relatos antiguos dicen 22.'],
    ['Satu perkemahan, sebuah awal', 'Pada 1907, Baden-Powell membawa 20 anak laki-laki ke perkemahan percobaan di Pulau Brownsea. WOSM kini menyebut 20; beberapa catatan lama menyebut 22.'],
    ['Um acampamento, um começo', 'Em 1907, Baden-Powell reuniu 20 meninos em um acampamento experimental na ilha de Brownsea. A WOSM hoje indica 20; alguns relatos antigos dizem 22.'],
    ['एक शिविर, एक शुरुआत', '1907 में बेडेन-पॉवेल 20 लड़कों को ब्राउनसी द्वीप के प्रयोगात्मक शिविर में लाए। WOSM अब 20 बताता है; कुछ पुराने विवरण 22 कहते हैं।'],
  ],
  'scouting-for-boys': [
    ['本になった冒険', '1908年、『Scouting for Boys』が分冊で刊行されました。若い読者たちは自ら班を作り始め、スカウト運動が広がり始めました。'],
    ['책으로 만나는 모험', '1908년 『Scouting for Boys』가 분책으로 나왔습니다. 어린 독자들이 스스로 패트롤을 만들기 시작했고 스카우트 운동이 퍼졌습니다.'],
    ['Une aventure imprimée', 'Scouting for Boys paraît en fascicules en 1908. De jeunes lecteurs commencent à former leurs propres patrouilles et le scoutisme se diffuse.'],
    ['Una aventura impresa', 'Scouting for Boys apareció por entregas en 1908. Los jóvenes lectores empezaron a formar sus propias patrullas y el escultismo comenzó a extenderse.'],
    ['Petualangan dalam cetakan', 'Scouting for Boys terbit dalam beberapa bagian pada 1908. Pembaca muda mulai membentuk regu sendiri dan kepanduan mulai menyebar.'],
    ['Uma aventura impressa', 'Scouting for Boys foi publicado em partes em 1908. Jovens leitores começaram a formar suas próprias patrulhas e o escotismo se espalhou.'],
    ['छपी हुई साहसिक यात्रा', 'Scouting for Boys 1908 में भागों में प्रकाशित हुई। युवा पाठकों ने अपनी टोलियाँ बनानी शुरू कीं और स्काउट आंदोलन फैलने लगा।'],
  ],
  'crystal-palace': [
    ['予想を超えた集会', 'ロンドンのクリスタル・パレスに1万1000人を超えるスカウトが集まり、運動の急速な広がりを示しました。'],
    ['예상을 뛰어넘은 집회', '런던 크리스털 팰리스 집회에 1만 1천 명이 넘는 스카우트가 모여 운동이 빠르게 성장했음을 보여주었습니다.'],
    ['Un rassemblement au-delà des attentes', 'Plus de 11 000 scouts se réunissent au Crystal Palace à Londres, montrant la croissance rapide du mouvement.'],
    ['Una concentración más allá de lo esperado', 'Más de 11.000 scouts se reunieron en el Crystal Palace de Londres, mostrando la rápida expansión del movimiento.'],
    ['Pertemuan di luar dugaan', 'Lebih dari 11.000 pandu berkumpul dalam pertemuan Crystal Palace di London, menunjukkan pesatnya pertumbuhan gerakan.'],
    ['Um encontro além das expectativas', 'Mais de 11 mil escoteiros reuniram-se no Crystal Palace, em Londres, mostrando o rápido crescimento do movimento.'],
    ['अपेक्षा से बड़ी सभा', 'लंदन के क्रिस्टल पैलेस में 11,000 से अधिक स्काउट जुटे, जिससे आंदोलन की तेज़ वृद्धि दिखाई दी।'],
  ],
  guides: [
    ['スカウト運動の新章', 'ベーデン＝パウエルはスカウト運動に専念するため退役しました。妹アグネスの指導の下、ガールガイドの発足にも協力しました。'],
    ['스카우트의 새 장', '베이든포월은 스카우트 운동에 전념하기 위해 군에서 은퇴했습니다. 여동생 애그니스의 지도 아래 걸가이딩의 시작도 도왔습니다.'],
    ['Un nouveau chapitre du scoutisme', 'Baden-Powell quitte l’armée pour se consacrer au scoutisme. Il aide aussi à lancer le guidisme sous la direction de sa sœur Agnes.'],
    ['Un nuevo capítulo del escultismo', 'Baden-Powell dejó el ejército para dedicarse al escultismo. También ayudó a iniciar el guidismo bajo el liderazgo de su hermana Agnes.'],
    ['Babak baru kepanduan', 'Baden-Powell pensiun dari tentara untuk mengabdikan diri pada kepanduan. Ia juga membantu memulai gerakan Girl Guiding di bawah kepemimpinan saudara perempuannya, Agnes.'],
    ['Um novo capítulo do escotismo', 'Baden-Powell deixou o exército para dedicar-se ao escotismo. Também ajudou a iniciar o movimento de guias sob a liderança de sua irmã Agnes.'],
    ['स्काउट आंदोलन का नया अध्याय', 'बेडेन-पॉवेल स्काउट आंदोलन को समर्पित होने के लिए सेना से सेवानिवृत्त हुए। उन्होंने अपनी बहन एग्नेस के नेतृत्व में गर्ल गाइडिंग शुरू करने में भी सहायता की।'],
  ],
  'hong-kong': [
    ['香港訪問', '1912年4月、ベーデン＝パウエルは香港を訪れ、総督官邸で訓練を受けた少年スカウトを視察しました。到着日と視察日は出典によって異なるため、月のみを表示しています。'],
    ['홍콩 방문', '1912년 4월 베이든포월은 홍콩을 방문해 총독 관저에서 스카우트 훈련을 받은 소년들을 사열했습니다. 도착일과 사열일에 대한 출처가 달라 월만 표시합니다.'],
    ['Une visite à Hong Kong', 'En avril 1912, Baden-Powell visite Hong Kong et inspecte des garçons formés comme scouts à Government House. Les sources divergent sur les dates d’arrivée et d’inspection ; seul le mois est indiqué.'],
    ['Una visita a Hong Kong', 'En abril de 1912, Baden-Powell visitó Hong Kong e inspeccionó en Government House a muchachos formados como scouts. Las fuentes difieren sobre la llegada y la inspección, por lo que solo se muestra el mes.'],
    ['Kunjungan ke Hong Kong', 'Pada April 1912, Baden-Powell mengunjungi Hong Kong dan memeriksa anak-anak yang dilatih sebagai pandu di Government House. Sumber berbeda tentang tanggal kedatangan dan pemeriksaan, sehingga hanya bulan yang ditampilkan.'],
    ['Uma visita a Hong Kong', 'Em abril de 1912, Baden-Powell visitou Hong Kong e inspecionou meninos treinados como escoteiros na Government House. As fontes divergem sobre as datas de chegada e inspeção; apenas o mês é mostrado.'],
    ['हांगकांग की यात्रा', 'अप्रैल 1912 में बेडेन-पॉवेल हांगकांग गए और गवर्नमेंट हाउस में स्काउट के रूप में प्रशिक्षित लड़कों का निरीक्षण किया। आगमन और निरीक्षण की तिथियों पर स्रोत अलग हैं, इसलिए केवल महीना दिखाया गया है।'],
  ],
  parkstone: [
    ['旅を共にするパートナー', '1912年、ベーデン＝パウエルはオレーブ・ソームズと結婚しました。二人はスカウトとガイドの発展を共に支えました。'],
    ['여정의 동반자', '1912년 베이든포월은 올레이브 솜스와 결혼했습니다. 두 사람은 함께 스카우트와 가이딩의 발전을 지원했습니다.'],
    ['Une partenaire de voyage', 'En 1912, Baden-Powell épouse Olave Soames. Ensemble, ils soutiennent le développement du scoutisme et du guidisme.'],
    ['Una compañera de viaje', 'En 1912, Baden-Powell se casó con Olave Soames. Juntos apoyaron el desarrollo del escultismo y el guidismo.'],
    ['Mitra dalam perjalanan', 'Pada 1912, Baden-Powell menikahi Olave Soames. Bersama-sama mereka mendukung perkembangan kepanduan dan Guiding.'],
    ['Uma parceira na jornada', 'Em 1912, Baden-Powell casou-se com Olave Soames. Juntos, apoiaram o desenvolvimento do escotismo e do movimento de guias.'],
    ['यात्रा की साथी', '1912 में बेडेन-पॉवेल ने ओलेव सोम्स से विवाह किया। दोनों ने मिलकर स्काउटिंग और गाइडिंग के विकास का समर्थन किया।'],
  ],
  gilwell: [
    ['指導者が学ぶ場所', 'ギルウェル・パークは1919年に開設され、スカウト指導者の訓練を始め、スカウトの方法をさらに広めました。'],
    ['지도자가 배우는 곳', '길웰 파크는 1919년 문을 열고 스카우트 지도자 훈련을 시작하여 스카우트 방법이 더 널리 퍼지도록 도왔습니다.'],
    ['Un lieu de formation des chefs', 'Gilwell Park ouvre en 1919 et commence à former des responsables scouts, contribuant à diffuser la méthode scoute.'],
    ['Un lugar para formar dirigentes', 'Gilwell Park abrió en 1919 y comenzó a formar dirigentes scouts, ayudando a difundir el método scout.'],
    ['Tempat pemimpin belajar', 'Gilwell Park dibuka pada 1919 dan mulai melatih pemimpin pandu, membantu metode kepanduan menyebar lebih jauh.'],
    ['Um lugar para formar líderes', 'Gilwell Park abriu em 1919 e começou a formar líderes escoteiros, ajudando a difundir o método escoteiro.'],
    ['नेताओं के सीखने का स्थान', 'गिलवेल पार्क 1919 में खुला और स्काउट नेताओं का प्रशिक्षण शुरू हुआ, जिससे स्काउट पद्धति और दूर तक पहुँची।'],
  ],
  olympia: [
    ['世界がロンドンに集まる', '第1回世界スカウトジャンボリーがロンドンで開催され、ベーデン＝パウエルは世界の総長と称えられました。'],
    ['세계가 런던에 모이다', '제1회 세계스카우트잼버리가 런던에서 열렸으며 베이든포월은 세계 총재로 추대되었습니다.'],
    ['Le monde se réunit à Londres', 'Le premier jamboree scout mondial a lieu à Londres, où Baden-Powell est acclamé chef scout mondial.'],
    ['El mundo se reúne en Londres', 'El primer Jamboree Scout Mundial se celebró en Londres, donde Baden-Powell fue aclamado Jefe Scout Mundial.'],
    ['Dunia berkumpul di London', 'Jambore Pramuka Dunia pertama diadakan di London, tempat Baden-Powell diakui sebagai Kepala Pandu Dunia.'],
    ['O mundo se reúne em Londres', 'O primeiro Jamboree Mundial Escoteiro ocorreu em Londres, onde Baden-Powell foi aclamado Chefe Escoteiro Mundial.'],
    ['लंदन में दुनिया का मिलन', 'पहली विश्व स्काउट जंबूरी लंदन में हुई, जहाँ बेडेन-पॉवेल को विश्व का मुख्य स्काउट घोषित किया गया।'],
  ],
  'arrowe-park': [
    ['世界中から集まった仲間', '第3回世界スカウトジャンボリーがアロー・パークで開催されました。同年、ベーデン＝パウエルは爵位を授けられ、ギルウェルのベーデン＝パウエル卿となりました。'],
    ['세계 각지에서 온 친구들', '제3회 세계스카우트잼버리가 애로우 파크에서 열렸습니다. 같은 해 베이든포월은 귀족 작위를 받아 길웰의 베이든포월 경이 되었습니다.'],
    ['Des amis du monde entier', 'Le troisième jamboree scout mondial se tient à Arrowe Park. Cette année-là, Baden-Powell reçoit une pairie et devient Lord Baden-Powell de Gilwell.'],
    ['Amigos de todo el mundo', 'El tercer Jamboree Scout Mundial tuvo lugar en Arrowe Park. Ese año Baden-Powell recibió un título nobiliario y se convirtió en Lord Baden-Powell de Gilwell.'],
    ['Sahabat dari seluruh dunia', 'Jambore Pramuka Dunia ketiga berlangsung di Arrowe Park. Tahun itu Baden-Powell menerima gelar bangsawan dan menjadi Lord Baden-Powell dari Gilwell.'],
    ['Amigos do mundo inteiro', 'O terceiro Jamboree Mundial Escoteiro ocorreu em Arrowe Park. Nesse ano, Baden-Powell recebeu um título de nobreza e tornou-se Lord Baden-Powell de Gilwell.'],
    ['दुनिया भर से मित्र', 'तीसरी विश्व स्काउट जंबूरी एरो पार्क में हुई। उसी वर्ष बेडेन-पॉवेल को उपाधि मिली और वे गिलवेल के लॉर्ड बेडेन-पॉवेल बने।'],
  ],
  vogelenzang: [
    ['スカウトへの別れ', '第5回世界スカウトジャンボリーがオランダで開催され、ベーデン＝パウエルはスカウトに別れを告げました。'],
    ['스카우트에게 작별을', '제5회 세계스카우트잼버리가 네덜란드에서 열렸고 베이든포월은 스카우트들에게 작별을 고했습니다.'],
    ['Un adieu aux scouts', 'Le cinquième jamboree scout mondial a lieu aux Pays-Bas, où Baden-Powell fait ses adieux aux scouts.'],
    ['Una despedida de los scouts', 'El quinto Jamboree Scout Mundial se celebró en los Países Bajos, donde Baden-Powell se despidió de los scouts.'],
    ['Perpisahan dengan para pandu', 'Jambore Pramuka Dunia kelima diadakan di Belanda, tempat Baden-Powell menyampaikan perpisahan kepada para pandu.'],
    ['Uma despedida dos escoteiros', 'O quinto Jamboree Mundial Escoteiro ocorreu nos Países Baixos, onde Baden-Powell se despediu dos escoteiros.'],
    ['स्काउटों से विदाई', 'पाँचवीं विश्व स्काउट जंबूरी नीदरलैंड में हुई, जहाँ बेडेन-पॉवेल ने स्काउटों से विदाई ली।'],
  ],
  'nyeri-home': [
    ['ケニア山の麓の住まい', '晩年、健康が衰える中でケニアへ移り、ニエリで最後の数年間を過ごしました。'],
    ['케냐산 아래의 집', '말년에 건강이 나빠지자 케냐로 이주해 니에리에서 마지막 몇 년을 보냈습니다.'],
    ['Une maison au pied du mont Kenya', 'Dans ses dernières années, Baden-Powell s’installe au Kenya alors que sa santé décline. Il passe ses dernières années à Nyeri.'],
    ['Un hogar al pie del monte Kenia', 'En sus últimos años, Baden-Powell se trasladó a Kenia al empeorar su salud. Pasó sus últimos años en Nyeri.'],
    ['Rumah di kaki Gunung Kenya', 'Pada masa tuanya, Baden-Powell pindah ke Kenya ketika kesehatannya menurun. Ia menghabiskan tahun-tahun terakhirnya di Nyeri.'],
    ['Um lar aos pés do Monte Quênia', 'Mais tarde, Baden-Powell mudou-se para o Quênia com a saúde debilitada. Passou seus últimos anos em Nyeri.'],
    ['माउंट केन्या के नीचे घर', 'अंतिम जीवन में स्वास्थ्य गिरने पर बेडेन-पॉवेल केन्या चले गए। उन्होंने अंतिम वर्ष न्येरी में बिताए।'],
  ],
  'nyeri-legacy': [
    ['世界を少しでもよくして残そう', 'ベーデン＝パウエルは1941年1月8日、83歳でニエリに亡くなりました。最後のメッセージは、世界を少しでもよくして残すよう今もスカウトを励ましています。'],
    ['세상을 조금 더 나은 곳으로', '베이든포월은 1941년 1월 8일 니에리에서 83세로 사망했습니다. 그의 마지막 메시지는 세상을 조금 더 나은 곳으로 남기도록 지금도 스카우트를 격려합니다.'],
    ['Laisser le monde un peu meilleur', 'Baden-Powell meurt à Nyeri le 8 janvier 1941, à 83 ans. Son dernier message continue d’encourager les scouts à laisser le monde un peu meilleur.'],
    ['Dejar el mundo un poco mejor', 'Baden-Powell murió en Nyeri el 8 de enero de 1941, a los 83 años. Su último mensaje sigue animando a los scouts a dejar el mundo un poco mejor.'],
    ['Tinggalkan dunia sedikit lebih baik', 'Baden-Powell meninggal di Nyeri pada 8 Januari 1941 dalam usia 83 tahun. Pesan terakhirnya terus mendorong pandu untuk meninggalkan dunia sedikit lebih baik.'],
    ['Deixar o mundo um pouco melhor', 'Baden-Powell morreu em Nyeri em 8 de janeiro de 1941, aos 83 anos. Sua última mensagem continua incentivando escoteiros a deixar o mundo um pouco melhor.'],
    ['दुनिया को थोड़ा बेहतर छोड़ें', 'बेडेन-पॉवेल का निधन 8 जनवरी 1941 को न्येरी में 83 वर्ष की आयु में हुआ। उनका अंतिम संदेश आज भी स्काउटों को दुनिया थोड़ा बेहतर छोड़ने को प्रेरित करता है।'],
  ],
};
const places = {
  'London': ['ロンドン', '런던', 'Londres', 'Londres', 'London', 'Londres', 'लंदन'],
  'Charterhouse School': ['チャーターハウス校', '차터하우스 학교', 'École de Charterhouse', 'Escuela Charterhouse', 'Sekolah Charterhouse', 'Escola Charterhouse', 'चार्टरहाउस स्कूल'],
  'Lucknow': ['ラクナウ', '러크나우', 'Lucknow', 'Lucknow', 'Lucknow', 'Lucknow', 'लखनऊ'],
  'Natal': ['ナタール', '나탈', 'Natal', 'Natal', 'Natal', 'Natal', 'नटाल'],
  'Valletta': ['バレッタ', '발레타', 'La Valette', 'La Valeta', 'Valletta', 'Valeta', 'वैलेटा'],
  'Kumasi': ['クマシ', '쿠마시', 'Kumasi', 'Kumasi', 'Kumasi', 'Kumasi', 'कुमासी'],
  'Mafeking': ['マフェキング', '마페킹', 'Mafeking', 'Mafeking', 'Mafeking', 'Mafeking', 'माफ़ेकिंग'],
  'Brownsea Island': ['ブラウンシー島', '브라운시섬', 'Île de Brownsea', 'Isla de Brownsea', 'Pulau Brownsea', 'Ilha de Brownsea', 'ब्राउनसी द्वीप'],
  'Crystal Palace': ['クリスタル・パレス', '크리스털 팰리스', 'Crystal Palace', 'Crystal Palace', 'Crystal Palace', 'Crystal Palace', 'क्रिस्टल पैलेस'],
  'Government House, Hong Kong': ['香港総督官邸', '홍콩 총독 관저', 'Government House, Hong Kong', 'Government House, Hong Kong', 'Government House, Hong Kong', 'Government House, Hong Kong', 'गवर्नमेंट हाउस, हांगकांग'],
  'Parkstone': ['パークストーン', '파크스톤', 'Parkstone', 'Parkstone', 'Parkstone', 'Parkstone', 'पार्कस्टोन'],
  'Gilwell Park': ['ギルウェル・パーク', '길웰 파크', 'Gilwell Park', 'Gilwell Park', 'Gilwell Park', 'Gilwell Park', 'गिलवेल पार्क'],
  'Olympia, London': ['ロンドン・オリンピア', '런던 올림피아', 'Olympia, Londres', 'Olympia, Londres', 'Olympia, London', 'Olympia, Londres', 'ओलंपिया, लंदन'],
  'Arrowe Park': ['アロー・パーク', '애로우 파크', 'Arrowe Park', 'Arrowe Park', 'Arrowe Park', 'Arrowe Park', 'एरो पार्क'],
  'Vogelenzang': ['フォーヘレンザング', '보헬렌장', 'Vogelenzang', 'Vogelenzang', 'Vogelenzang', 'Vogelenzang', 'वोखेलेंज़ांग'],
  'Nyeri': ['ニエリ', '니에리', 'Nyeri', 'Nyeri', 'Nyeri', 'Nyeri', 'न्येरी'],
  'British India': ['英領インド', '영국령 인도', 'Inde britannique', 'India británica', 'India Britania', 'Índia Britânica', 'ब्रिटिश भारत'],
  'Colony of Natal': ['ナタール植民地', '나탈 식민지', 'Colonie du Natal', 'Colonia de Natal', 'Koloni Natal', 'Colônia de Natal', 'नटाल उपनिवेश'],
  'Gold Coast': ['ゴールド・コースト', '골드코스트', 'Côte-de-l’Or', 'Costa de Oro', 'Gold Coast', 'Costa do Ouro', 'गोल्ड कोस्ट'],
  'Present-day Mahikeng': ['現在のマヒケング', '오늘날의 마히켕', 'Mahikeng aujourd’hui', 'Actual Mahikeng', 'Mahikeng saat ini', 'Atual Mahikeng', 'वर्तमान महिकेंग'],
  'Colony of Kenya': ['ケニア植民地', '케냐 식민지', 'Colonie du Kenya', 'Colonia de Kenia', 'Koloni Kenya', 'Colônia do Quênia', 'केन्या उपनिवेश'],
};
const commonNotes = {
  'A sufficiently supported early local troop date has not yet been established for the map; a blank area does not mean there was no Scouting.': [
    '地図に表示できる十分な根拠のある地域初期隊の年はまだ確認されていません。空白はスカウト活動がなかったことを意味しません。',
    '지도에 표시할 충분한 근거가 있는 초기 지역 대의 연도가 아직 확인되지 않았습니다. 빈 곳은 스카우트 활동이 없었다는 뜻이 아닙니다.',
    'Aucune date suffisamment étayée pour une première troupe locale n’a encore été établie pour la carte ; une zone vide ne signifie pas absence de scoutisme.',
    'Aún no se ha establecido una fecha suficientemente respaldada de una tropa local inicial para el mapa; una zona vacía no significa ausencia de escultismo.',
    'Tahun regu lokal awal yang cukup didukung sumber belum ditetapkan untuk peta; area kosong tidak berarti kepanduan tidak ada.',
    'Ainda não foi estabelecida uma data suficientemente fundamentada de uma tropa local inicial para o mapa; uma área vazia não significa ausência de escotismo.',
    'मानचित्र के लिए पर्याप्त प्रमाण वाली प्रारंभिक स्थानीय दल की तिथि अभी तय नहीं हुई है; खाली क्षेत्र का अर्थ स्काउट गतिविधि का अभाव नहीं है।',
  ],
  '10 August report; later 176 that year.': [
    '8月10日の報告。同年後に176となりました。', '8월 10일 보고. 같은 해 후반 176개가 되었습니다.', 'Communiqué du 10 août ; 176 plus tard dans l’année.', 'Informe del 10 de agosto; después 176 ese año.', 'Laporan 10 Agustus; kemudian 176 pada tahun itu.', 'Relatório de 10 de agosto; depois 176 naquele ano.', '10 अगस्त की रिपोर्ट; उसी वर्ष बाद में 176।',
  ],
};
const territoryNames = {
  HKG: ['香港', '홍콩', 'Hong Kong', 'Hong Kong', 'Hong Kong', 'Hong Kong', 'हांगकांग'],
  MAC: ['マカオ', '마카오', 'Macao', 'Macao', 'Makau', 'Macau', 'मकाऊ'],
};
function addTranslations(value, translations) {
  if (!value || !translations) return;
  extraLanguages.forEach((lang, index) => { if (translations[index]) value[lang] = translations[index]; });
}
function translateKnown(value, table) { if (value?.en) addTranslations(value, table[value.en]); }

// Called after fetch on a mutable in-memory copy, never changes the data files.
// The Intl/CLDR country names are used only for the seven additional languages.
// CUW is a multi-territory entry and must not collapse to just Curaçao.
export function enhanceLocalizedData(data) {
  const regions = new Map(), localeNames = new Map();
  for (const lang of extraLanguages) {
    try { localeNames.set(lang, new Intl.DisplayNames([lang], { type: 'region' })); } catch { /* Fall back to source English if unavailable. */ }
  }
  for (const item of data.nso || []) {
    regions.set(item.name.en, item.iso2);
    for (const lang of extraLanguages) {
      const display = localeNames.get(lang); if (!display) continue;
      try {
        const translated = item.id === 'CUW'
          ? new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(['CW', 'SX', 'BQ'].map(code => display.of(code)))
          : display.of(item.iso2);
        if (translated && translated !== item.iso2) item.name[lang] = translated;
      } catch { /* Leave the original source language as fallback. */ }
    }
    addTranslations(item.name, territoryNames[item.id]);
    translateKnown(item.note, commonNotes);
  }
  regions.set('Iran', 'IR');
  for (const row of [...(data.journey || []), ...(data.jamborees || [])]) {
    const translated = journey[row.id];
    if (translated) extraLanguages.forEach((lang, index) => {
      row.title[lang] = translated[index][0]; row.body[lang] = translated[index][1];
    });
    translateKnown(row.place, places); translateKnown(row.placeThen, places);
    const iso = regions.get(row.country?.en);
    for (const lang of extraLanguages) {
      const display = localeNames.get(lang); if (!display || !iso) continue;
      try { const name = display.of(iso); if (name && name !== iso) row.country[lang] = name; } catch { /* Keep fallback. */ }
    }
    if (iso === 'HK') addTranslations(row.country, territoryNames.HKG);
  }
  for (const row of data.membership || []) translateKnown(row.organisationNote, commonNotes);
  return data;
}
