<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Fason Baskı & Dijital Baskı | Uzman Reklam</title>
    <meta name="description" content="Türkiye geneline fason dijital baskı. Folyo, branda, one-way vision, vinil, mesh ve daha fazlası. Ölçünü gir, fiyatını gör, WhatsApp'tan sipariş ver." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        :root {
            --neon: #ccff00;
            --bg: #050505;
            --card: #0f0f0f;
            --border: #1a1a1a;
            --text: #eee;
            --gray: #888;
        }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: 'Inter', sans-serif;
            padding: 20px;
            line-height: 1.5;
        }
        .container {
            max-width: 1100px;
            margin: 0 auto;
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0 30px;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
            gap: 15px;
        }
        .logo {
            font-weight: 900;
            font-size: 28px;
            letter-spacing: -1px;
            text-transform: uppercase;
            color: #fff;
            text-decoration: none;
        }
        .logo span {
            color: var(--neon);
        }
        .header-info {
            font-size: 14px;
            color: var(--gray);
        }
        .header-info i {
            color: var(--neon);
            margin-right: 6px;
        }

        /* HERO - Arka plan görselli */
        .hero {
            text-align: center;
            padding: 80px 20px 60px;
            background: linear-gradient(rgba(5,5,5,0.7), rgba(5,5,5,0.9)), 
                        url('https://images.pexels.com/photos/3756762/pexels-photo-3756762.jpeg') center/cover no-repeat;
            border-radius: 24px;
            margin-bottom: 40px;
            border: 1px solid var(--border);
        }
        .hero h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 900;
            letter-spacing: -1px;
            text-transform: uppercase;
            line-height: 1.1;
        }
        .hero h1 span {
            color: var(--neon);
        }
        .hero p {
            color: #ddd;
            font-size: 1.1rem;
            max-width: 700px;
            margin: 15px auto 30px;
            line-height: 1.6;
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
        }
        .btn-main {
            background: var(--neon);
            color: #000;
            padding: 16px 40px;
            border-radius: 50px;
            font-weight: 900;
            text-transform: uppercase;
            border: none;
            cursor: pointer;
            transition: 0.3s;
            font-size: 1rem;
            display: inline-block;
            text-decoration: none;
        }
        .btn-main:hover {
            transform: scale(1.05);
            background: #d4ff33;
        }
        .btn-main i {
            margin-right: 10px;
        }

        /* HESAPLAYICI */
        .calculator {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
        }
        .calculator h2 {
            color: var(--neon);
            font-size: 1.6rem;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .calculator .sub {
            color: var(--gray);
            margin-bottom: 25px;
            font-size: 0.95rem;
        }
        .calc-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 600px) {
            .calc-grid {
                grid-template-columns: 1fr;
            }
        }
        .calc-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .calc-group label {
            font-weight: 600;
            font-size: 0.9rem;
            color: #ccc;
        }
        .calc-group select,
        .calc-group input {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 14px 16px;
            color: #fff;
            font-size: 1rem;
            outline: none;
            transition: 0.3s;
            width: 100%;
        }
        .calc-group select:focus,
        .calc-group input:focus {
            border-color: var(--neon);
        }
        .calc-group select option {
            background: #111;
        }
        .calc-result {
            background: #0a0a0a;
            border: 1px solid #222;
            border-radius: 14px;
            padding: 20px;
            margin-top: 25px;
            text-align: center;
        }
        .calc-result .price {
            font-size: 2.2rem;
            font-weight: 900;
            color: var(--neon);
            letter-spacing: -0.5px;
        }
        .calc-result .price small {
            font-size: 1rem;
            font-weight: 400;
            color: var(--gray);
        }
        .calc-result .detail {
            color: #aaa;
            font-size: 0.9rem;
            margin: 10px 0;
        }
        .calc-result .btn-wa {
            display: inline-block;
            background: #25d366;
            color: #000;
            padding: 14px 30px;
            border-radius: 50px;
            font-weight: 800;
            text-decoration: none;
            margin-top: 12px;
            transition: 0.3s;
        }
        .calc-result .btn-wa:hover {
            background: #1ebe57;
            transform: scale(1.03);
        }
        .calc-result .btn-wa i {
            margin-right: 10px;
        }
        .calc-note {
            font-size: 0.75rem;
            color: #666;
            margin-top: 15px;
        }

        /* ÜRÜN KARTLARI - Görselli */
        .products {
            margin: 50px 0;
        }
        .products h2 {
            color: var(--neon);
            font-size: 1.8rem;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 30px;
        }
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
        }
        .product-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 0;
            overflow: hidden;
            transition: 0.4s;
            text-align: center;
        }
        .product-card:hover {
            border-color: var(--neon);
            transform: translateY(-6px);
            box-shadow: 0 10px 30px rgba(204,255,0,0.08);
        }
        .product-card .card-img {
            width: 100%;
            height: 180px;
            object-fit: cover;
            display: block;
            background: #111;
        }
        .product-card .card-body {
            padding: 18px 18px 22px;
        }
        .product-card .card-body h3 {
            font-size: 1.1rem;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .product-card .card-body .desc {
            color: var(--gray);
            font-size: 0.82rem;
            margin: 6px 0 12px;
        }
        .product-card .card-body .fiyat {
            font-weight: 900;
            color: var(--neon);
            font-size: 1.1rem;
        }
        .product-card .card-body .fiyat small {
            font-weight: 400;
            color: #666;
            font-size: 0.75rem;
        }

        /* SSS */
        .faq {
            margin: 50px 0;
        }
        .faq h2 {
            color: var(--neon);
            font-size: 1.8rem;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 30px;
        }
        .faq-item {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 18px 22px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: 0.2s;
        }
        .faq-item:hover {
            border-color: #333;
        }
        .faq-question {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            font-size: 1.05rem;
        }
        .faq-question i {
            color: var(--neon);
            transition: 0.3s;
        }
        .faq-answer {
            color: #aaa;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-top: 12px;
            display: none;
        }
        .faq-answer.open {
            display: block;
        }

        /* FOOTER */
        .footer {
            border-top: 1px solid var(--border);
            padding: 30px 0 20px;
            text-align: center;
            color: #555;
            font-size: 0.85rem;
            margin-top: 40px;
        }
        .footer a {
            color: var(--neon);
            text-decoration: none;
        }

        /* SABİT WHATSAPP */
        .wp-float {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 999;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .wp-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #25d366;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #fff;
            text-decoration: none;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
            transition: 0.3s;
        }
        .wp-btn:hover {
            transform: scale(1.08);
        }
        @media (max-width: 600px) {
            .wp-btn {
                width: 50px;
                height: 50px;
                font-size: 26px;
            }
        }

        @media (max-width: 480px) {
            .header {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .hero h1 {
                font-size: 1.8rem;
            }
            .calculator {
                padding: 20px;
            }
            .calc-result .price {
                font-size: 1.6rem;
            }
        }
    </style>
</head>
<body>

    <div class="container">

        <!-- HEADER -->
        <header class="header">
            <a href="/" class="logo">UZMAN<span>REKLAM</span></a>
            <div class="header-info">
                <i class="fas fa-phone-alt"></i> 0532 220 46 49 &nbsp;|&nbsp; <i class="fab fa-whatsapp"></i> 0507 960 50 49
            </div>
        </header>

        <!-- HERO - Görselli -->
        <section class="hero">
            <h1>FASON <span>DİJİTAL BASKI</span></h1>
            <p>Türkiye'nin her yerine fason baskı. Folyo, branda, one-way vision, vinil, mesh ve daha fazlası. Ölçünü gir, fiyatını gör, WhatsApp'tan sipariş ver.</p>
            <a href="#hesapla" class="btn-main"><i class="fas fa-calculator"></i> HEMEN FİYAT HESAPLA</a>
        </section>

        <!-- HESAPLAYICI -->
        <section class="calculator" id="hesapla">
            <h2><i class="fas fa-sliders-h"></i> Fiyat Hesaplayıcı</h2>
            <p class="sub">Malzeme seç, en ve boy ölçülerini gir, tahmini fiyatı anında gör.</p>

            <div class="calc-grid">
                <div class="calc-group">
                    <label for="malzeme">Malzeme Seç</label>
                    <select id="malzeme">
                        <option value="ince_vinil">İnce Vinil</option>
                        <option value="normal_vinil">Normal Vinil</option>
                        <option value="avrupa_vinil">Avrupa Vinil</option>
                        <option value="arkasi_siyah_vinil">Arkası Siyah Vinil</option>
                        <option value="mesh_vinil">Mesh Vinil</option>
                        <option value="isikli_vinil">Işıklı Vinil</option>
                        <option value="frimpeks_folyo">Frimpeks Folyo</option>
                        <option value="frimpeks_gri_folyo">Frimpeks Arkası Gri Folyo</option>
                        <option value="unifol_folyo">Unifol Folyo</option>
                        <option value="unifol_gri_folyo">Unifol Arkası Gri Folyo</option>
                        <option value="one_way_vision">One Way Vision</option>
                        <option value="reflektif_folyo">Reflektif Folyo</option>
                        <option value="kumlu_folyo">Kumlu Folyo</option>
                        <option value="canvas">Canvas Baskı</option>
                        <option value="magnet">Magnet Baskı</option>
                        <option value="kagit_baski">Kağıt Baskı</option>
                    </select>
                </div>
                <div class="calc-group">
                    <label for="en">En (cm)</label>
                    <input type="number" id="en" placeholder="Örn: 100" min="1" value="100">
                </div>
                <div class="calc-group">
                    <label for="boy">Boy (cm)</label>
                    <input type="number" id="boy" placeholder="Örn: 50" min="1" value="50">
                </div>
                <div class="calc-group">
                    <label for="kargo">Kargo Seçeneği</label>
                    <select id="kargo">
                        <option value="standart">Standart (60 TL)</option>
                        <option value="express">Express (90 TL)</option>
                    </select>
                </div>
            </div>

            <button class="btn-main" onclick="hesapla()" style="width:100%; margin-top:20px; text-align:center;">
                <i class="fas fa-calculator"></i> HESAPLA
            </button>

            <div class="calc-result" id="sonuc">
                <div class="price">—</div>
                <div class="detail">Tahmini fiyat görünüyor</div>
                <div class="calc-note">* KDV hariç, kesin fiyat için WhatsApp'tan teyit alın.</div>
            </div>
        </section>

        <!-- ÜRÜN KARTLARI - Görselli -->
        <section class="products">
            <h2>Tüm Ürünler</h2>
            <div class="product-grid">
                <!-- İnce Vinil -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/209224/pexels-photo-209224.jpeg" alt="İnce Vinil Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>İnce Vinil</h3>
                        <div class="desc">Konica Solvent, dış mekan</div>
                        <div class="fiyat">~85 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Normal Vinil -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/209224/pexels-photo-209224.jpeg" alt="Normal Vinil Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Normal Vinil</h3>
                        <div class="desc">Konica Solvent, dış mekan</div>
                        <div class="fiyat">~110 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Avrupa Vinil -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/356043/pexels-photo-356043.jpeg" alt="Avrupa Vinil Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Avrupa Vinil</h3>
                        <div class="desc">Konica Solvent, kaliteli</div>
                        <div class="fiyat">~127 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Mesh Vinil -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/208736/pexels-photo-208736.jpeg" alt="Mesh Vinil Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Mesh Vinil</h3>
                        <div class="desc">Delikli, rüzgar geçirgen</div>
                        <div class="fiyat">~148 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Işıklı Vinil -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/356043/pexels-photo-356043.jpeg" alt="Işıklı Vinil Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Işıklı Vinil</h3>
                        <div class="desc">Arkadan aydınlatmalı</div>
                        <div class="fiyat">~223 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Frimpeks Folyo -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/3756762/pexels-photo-3756762.jpeg" alt="Frimpeks Folyo Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Frimpeks Folyo</h3>
                        <div class="desc">Solvent folyo, renkli</div>
                        <div class="fiyat">~148 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Unifol Folyo -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/3756762/pexels-photo-3756762.jpeg" alt="Unifol Folyo Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Unifol Folyo</h3>
                        <div class="desc">Solvent folyo, kaliteli</div>
                        <div class="fiyat">~177 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- One Way Vision -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/2668405/pexels-photo-2668405.jpeg" alt="One Way Vision Cam Folyosu" loading="lazy">
                    <div class="card-body">
                        <h3>One Way Vision</h3>
                        <div class="desc">Cam folyosu, içerisi görünmez</div>
                        <div class="fiyat">~188 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Reflektif Folyo -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/1227513/pexels-photo-1227513.jpeg" alt="Reflektif Folyo" loading="lazy">
                    <div class="card-body">
                        <h3>Reflektif Folyo</h3>
                        <div class="desc">Gece ışıltılı</div>
                        <div class="fiyat">~587 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Kumlu Folyo -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/3756762/pexels-photo-3756762.jpeg" alt="Kumlu Folyo" loading="lazy">
                    <div class="card-body">
                        <h3>Kumlu Folyo</h3>
                        <div class="desc">Dekoratif kum efekti</div>
                        <div class="fiyat">~188 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Canvas Baskı -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/1029619/pexels-photo-1029619.jpeg" alt="Canvas Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Canvas Baskı</h3>
                        <div class="desc">Tuval görünümlü, dekoratif</div>
                        <div class="fiyat">~446 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Magnet Baskı -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/3769711/pexels-photo-3769711.jpeg" alt="Magnet Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Magnet Baskı</h3>
                        <div class="desc">Manyetik folyo</div>
                        <div class="fiyat">~611 TL <small>/m²</small></div>
                    </div>
                </div>
                <!-- Kağıt Baskı -->
                <div class="product-card">
                    <img class="card-img" src="https://images.pexels.com/photos/669996/pexels-photo-669996.jpeg" alt="Kağıt Baskı" loading="lazy">
                    <div class="card-body">
                        <h3>Kağıt Baskı</h3>
                        <div class="desc">İç mekan afiş, poster</div>
                        <div class="fiyat">~70 TL <small>/m²</small></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- SSS -->
        <section class="faq">
            <h2>Sıkça Sorulan Sorular</h2>

            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Fason baskı ne demek?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">Fason baskı, sizin tasarımınızı bizim makinalarımızda basıp size göndermemizdir. Montaj yok, sadece baskı hizmeti.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Hangi dosya formatlarını göndermeliyim?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">PDF, JPG, PNG, AI, EPS kabul ediyoruz. Çözünürlük en az 150 dpi olmalı. WhatsApp'tan gönderebilirsiniz.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Kargo kaç günde gelir?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">Türkiye geneli 1-3 iş günü. İstanbul, Ankara, İzmir 1-2 gün. Takip numarası gönderiyoruz.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Ödeme nasıl yapılır?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">Havale/EFT ile ödeme. Sipariş onayı sonrası banka bilgilerimizi gönderiyoruz. Kredi kartı için yakında.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Yanlış ölçü gönderirsem ne olur?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">Üretim öncesi ölçüyü sizinle teyit ediyoruz. Yine de hata olursa yeniden basıyoruz (malzeme bedeli müşteriden).</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question"><span>Siparişimi nasıl takip edebilirim?</span><i class="fas fa-plus"></i></div>
                <div class="faq-answer">Kargoya verildikten sonra takip numarasını WhatsApp'tan gönderiyoruz. Kargo firmasının sitesinden takip edebilirsiniz.</div>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
            <p>© 2026 Uzman Reklam — Fason Dijital Baskı &amp; Tabela Fabrikası, Bafra/Samsun</p>
            <p style="margin-top:6px;">
                <a href="https://wa.me/905079605049" target="_blank">WhatsApp</a> &nbsp;|&nbsp;
                <a href="mailto:uzmandosya@hotmail.com">E-posta</a> &nbsp;|&nbsp;
                <a href="https://www.instagram.com/uzman.reklamm/" target="_blank">Instagram</a>
            </p>
        </footer>

    </div>

    <!-- SABİT WHATSAPP BUTONU -->
    <div class="wp-float">
        <a href="https://wa.me/905079605049" class="wp-btn" target="_blank">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <!-- JAVASCRIPT -->
    <script>
        // Fiyat verileri (11.07.2026 USD: 46.98 TL, EUR: 53.72 TL)
        const fiyatlar = {
            ince_vinil: { ad: 'İnce Vinil', fiyat: 1.80, birim: 'USD' },
            normal_vinil: { ad: 'Normal Vinil', fiyat: 2.35, birim: 'USD' },
            avrupa_vinil: { ad: 'Avrupa Vinil', fiyat: 2.70, birim: 'USD' },
            arkasi_siyah_vinil: { ad: 'Arkası Siyah Vinil', fiyat: 2.95, birim: 'USD' },
            mesh_vinil: { ad: 'Mesh Vinil', fiyat: 3.15, birim: 'USD' },
            isikli_vinil: { ad: 'Işıklı Vinil', fiyat: 4.75, birim: 'USD' },
            frimpeks_folyo: { ad: 'Frimpeks Folyo', fiyat: 2.75, birim: 'EUR' },
            frimpeks_gri_folyo: { ad: 'Frimpeks Arkası Gri Folyo', fiyat: 2.80, birim: 'EUR' },
            unifol_folyo: { ad: 'Unifol Folyo', fiyat: 3.30, birim: 'EUR' },
            unifol_gri_folyo: { ad: 'Unifol Arkası Gri Folyo', fiyat: 3.35, birim: 'EUR' },
            one_way_vision: { ad: 'One Way Vision', fiyat: 4.00, birim: 'USD' },
            reflektif_folyo: { ad: 'Reflektif Folyo', fiyat: 12.50, birim: 'USD' },
            kumlu_folyo: { ad: 'Kumlu Folyo', fiyat: 4.00, birim: 'USD' },
            canvas: { ad: 'Canvas Baskı', fiyat: 9.50, birim: 'USD' },
            magnet: { ad: 'Magnet Baskı', fiyat: 13.00, birim: 'USD' },
            kagit_baski: { ad: 'Kağıt Baskı', fiyat: 1.50, birim: 'USD' }
        };

        const kur_usd = 46.98;
        const kur_eur = 53.72;
        const kargo_fiyatlari = { standart: 60, express: 90 };

        function hesapla() {
            const malzemeKey = document.getElementById('malzeme').value;
            const en = parseFloat(document.getElementById('en').value);
            const boy = parseFloat(document.getElementById('boy').value);
            const kargoTip = document.getElementById('kargo').value;

            if (!en || !boy || en <= 0 || boy <= 0) {
                document.getElementById('sonuc').innerHTML = `
                    <div class="price" style="color:#ff6b6b;">Hata</div>
                    <div class="detail">Lütfen geçerli en ve boy girin.</div>
                    <div class="calc-note">* KDV hariç</div>
                `;
                return;
            }

            const urun = fiyatlar[malzemeKey];
            const m2 = (en * boy) / 10000;
            let fiyatDoviz = urun.fiyat;
            let kur = urun.birim === 'EUR' ? kur_eur : kur_usd;
            let fiyatTL = fiyatDoviz * kur;
            let toplamTL = fiyatTL * m2;

            // Minimum sipariş tutarı (50 TL altına 50 TL)
            if (toplamTL < 50) toplamTL = 50;

            const kargoUcret = kargo_fiyatlari[kargoTip] || 60;
            const genelToplam = toplamTL + kargoUcret;

            // sonucu göster
            const sonucDiv = document.getElementById('sonuc');
            sonucDiv.innerHTML = `
                <div class="price">${genelToplam.toFixed(0)} <small>TL</small></div>
                <div class="detail">
                    📐 ${m2.toFixed(2)} m² · ${urun.ad} · ${en}x${boy} cm<br>
                    Baskı: ${toplamTL.toFixed(0)} TL + Kargo: ${kargoUcret} TL
                </div>
                <a href="https://wa.me/905079605049?text=Merhaba,%20fason%20baskı%20için%20teklif%20almak%20istiyorum.%20${urun.ad}%20-%20${en}x${boy}cm%20-%20Tahmini%20Fiyat:%20${genelToplam.toFixed(0)}%20TL" 
                   target="_blank" class="btn-wa">
                    <i class="fab fa-whatsapp"></i> WhatsApp ile Sipariş Ver
                </a>
                <div class="calc-note">* KDV hariç, kesin fiyat WhatsApp'ta teyit edilir.</div>
            `;
        }

        // SSS toggle
        function toggleFaq(el) {
            const answer = el.querySelector('.faq-answer');
            const icon = el.querySelector('.faq-question i');
            if (answer.classList.contains('open')) {
                answer.classList.remove('open');
                icon.className = 'fas fa-plus';
            } else {
                answer.classList.add('open');
                icon.className = 'fas fa-minus';
            }
        }

        // Sayfa yüklenince otomatik hesapla
        window.onload = function() {
            hesapla();
        };
    </script>

</body>
</html>
