// Supondo que você tenha a imagem em src/assets/hero-beauty.jpg
import heroImage from '../assets/hero-beauty.jpg';

const Hero = () => {
  return (
    <div className="bg-light">
      <div className="container col-xxl-8 px-4 py-5">
        <div className="row flex-lg-row-reverse align-items-center g-5 py-5">
          {/* Coluna da Imagem */}
          <div className="col-10 col-sm-8 col-lg-6">
             <img src={heroImage} className="d-block mx-lg-auto img-fluid rounded-3 shadow-lg" alt="Produtos de maquiagem" loading="lazy" />
          </div>

          {/* Coluna do Conteúdo */}
          <div className="col-lg-6">
            <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill mb-3">
              Nova Coleção Disponível
            </span>
            <h1 className="display-4 fw-bold lh-1 mb-3">
              Realce sua beleza <span className="text-dark">natural</span>
            </h1>
            <p className="lead text-secondary">
              Descubra nossa coleção exclusiva de maquiagem e produtos de beleza premium. Qualidade superior para realçar sua beleza única.
            </p>
            <div className="d-grid gap-2 d-md-flex justify-content-md-start mt-4">
              <button type="button" className="btn btn-dark-custom btn-lg px-4 me-md-2">Explorar Produtos</button>
              <button type="button" className="btn btn-outline-custom btn-lg px-4">Ver Ofertas</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;