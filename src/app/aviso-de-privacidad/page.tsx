import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de privacidad — ARQOS",
  description:
    "Aviso de privacidad integral de ARQOS Unidad de Valuación, S.A. de C.V.",
};

const sectionTitle = "mt-10 font-body text-lg font-semibold text-black";
const paragraph = "mt-4 font-body text-base leading-relaxed";
const list = "mt-4 list-disc pl-6 font-body text-base leading-relaxed";

export default function AvisoDePrivacidad() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-3xl" style={{ color: "#2B2B2B" }}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-black">
          Aviso de privacidad integral
        </h1>

        <p className="mt-4 font-body text-sm" style={{ color: "#6E6E6E" }}>
          Última actualización: 16 de marzo de 2026
        </p>

        {/* I */}
        <h2 className={sectionTitle}>I. Identidad y domicilio del responsable</h2>
        <p className={paragraph}>
          ARQOS Unidad de Valuación, S.A. de C.V. (en adelante &ldquo;ARQOS&rdquo;), con
          domicilio en Querétaro, Querétaro, México, es responsable del tratamiento de sus
          datos personales conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP) vigente.
        </p>
        <p className={paragraph}>
          Contacto del responsable:{" "}
          <a href="mailto:contacto@arqos.mx" className="underline transition-colors hover:text-black">
            contacto@arqos.mx
          </a>
        </p>

        {/* II */}
        <h2 className={sectionTitle}>II. Datos personales que se recaban</h2>
        <p className={paragraph}>
          Para las finalidades señaladas en el presente aviso de privacidad, ARQOS podrá
          recabar las siguientes categorías de datos personales:
        </p>
        <p className={paragraph}>
          <strong className="text-black">Datos de identificación:</strong> nombre completo,
          Registro Federal de Contribuyentes (RFC), Clave Única de Registro de Población
          (CURP), domicilio, teléfono, correo electrónico.
        </p>
        <p className={paragraph}>
          <strong className="text-black">Datos laborales y profesionales:</strong> cargo,
          empresa u organización, cédula profesional (en el caso de valuadores).
        </p>
        <p className={paragraph}>
          <strong className="text-black">Datos patrimoniales o financieros:</strong>{" "}
          información relacionada con inmuebles objeto de valuación, datos de escrituras y
          registros públicos, información catastral. Estos datos requieren su consentimiento
          expreso.
        </p>
        <p className={paragraph}>ARQOS no recaba datos personales sensibles.</p>

        {/* III */}
        <h2 className={sectionTitle}>III. Finalidades del tratamiento</h2>
        <p className={paragraph}>
          Sus datos personales serán utilizados para las siguientes finalidades que requieren
          su consentimiento:
        </p>
        <ul className={list}>
          <li>
            Prestación de servicios de valuación inmobiliaria conforme a la normativa de la
            Sociedad Hipotecaria Federal (SHF).
          </li>
          <li>
            Elaboración de dictámenes y avalúos para instituciones de crédito, organismos
            nacionales de vivienda (INFONAVIT, FOVISSSTE) y entidades financieras.
          </li>
          <li>
            Integración de expedientes de valuación conforme a las Reglas de Carácter General
            emitidas por la SHF.
          </li>
          <li>
            Cumplimiento de reportes y obligaciones ante la SHF y el Sistema Maestro de
            Avalúos (SMA).
          </li>
          <li>Atención de solicitudes de información, cotizaciones y consultas.</li>
          <li>Envío de comunicaciones relacionadas con nuestros servicios.</li>
        </ul>
        <p className={paragraph}>Finalidades que no requieren consentimiento:</p>
        <ul className={list}>
          <li>Cumplimiento de obligaciones legales y regulatorias.</li>
          <li>Cumplimiento de requerimientos de autoridades competentes.</li>
        </ul>

        {/* IV */}
        <h2 className={sectionTitle}>
          IV. Mecanismos para limitar el uso o divulgación de sus datos
        </h2>
        <p className={paragraph}>
          Usted puede limitar el uso o divulgación de sus datos personales enviando una
          solicitud a{" "}
          <a href="mailto:contacto@arqos.mx" className="underline transition-colors hover:text-black">
            contacto@arqos.mx
          </a>{" "}
          indicando su nombre completo y los datos que desea limitar.
        </p>

        {/* V */}
        <h2 className={sectionTitle}>V. Derechos ARCO</h2>
        <p className={paragraph}>
          Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de
          sus datos personales (derechos ARCO). Para ejercer cualquiera de estos derechos,
          podrá presentar su solicitud a través del correo electrónico{" "}
          <a href="mailto:contacto@arqos.mx" className="underline transition-colors hover:text-black">
            contacto@arqos.mx
          </a>
          .
        </p>
        <p className={paragraph}>
          Su solicitud deberá contener: nombre completo del titular, domicilio o correo
          electrónico para comunicar la respuesta, documentos que acrediten su identidad,
          descripción clara y precisa de los datos personales respecto de los cuales busca
          ejercer algún derecho, y cualquier otro elemento que facilite la localización de los
          datos.
        </p>
        <p className={paragraph}>
          ARQOS dará respuesta a su solicitud en un plazo máximo de 20 días hábiles contados
          desde la fecha en que se recibió la solicitud. La respuesta indicará si la solicitud
          es procedente y, en su caso, se hará efectiva dentro de los 15 días hábiles
          siguientes a la fecha de la respuesta.
        </p>

        {/* VI */}
        <h2 className={sectionTitle}>VI. Medidas de seguridad</h2>
        <p className={paragraph}>
          ARQOS implementa medidas de seguridad administrativas, técnicas y físicas para
          proteger sus datos personales contra daño, pérdida, alteración, destrucción o acceso
          no autorizado, conforme a lo establecido en la LFPDPPP y su Reglamento.
        </p>

        {/* VII */}
        <h2 className={sectionTitle}>VII. Modificaciones al aviso de privacidad</h2>
        <p className={paragraph}>
          ARQOS se reserva el derecho de modificar el presente aviso de privacidad. Las
          modificaciones estarán disponibles en nuestro sitio web.
        </p>

        {/* VIII */}
        <h2 className={sectionTitle}>VIII. Autoridad competente</h2>
        <p className={paragraph}>
          En caso de considerar que su derecho a la protección de datos personales ha sido
          vulnerado, usted tiene derecho a acudir ante la Secretaría Anticorrupción y Buen
          Gobierno para hacer valer sus derechos, conforme a lo establecido en la LFPDPPP
          vigente.
        </p>

        {/* IX */}
        <h2 className={sectionTitle}>IX. Consentimiento</h2>
        <p className={paragraph}>
          Al proporcionar sus datos personales a ARQOS, usted otorga su consentimiento para
          el tratamiento de los mismos conforme a los términos del presente aviso de
          privacidad. Para datos patrimoniales o financieros, ARQOS solicitará su
          consentimiento expreso.
        </p>
      </div>
    </div>
  );
}
