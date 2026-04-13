/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Datos que necesita el PDF
export interface AvaluoPdfData {
  folio: string | null;
  fechaEmision: string;        // ISO
  // Inmueble
  direccion: string;
  municipio: string;
  estado_inmueble: string;
  tipo_inmueble: string;
  superficie_terreno: number | null;
  superficie_construccion: number | null;
  uso_suelo: string | null;
  clave_catastral: string | null;
  // Expediente
  fecha_solicitud: string;     // ISO
  fecha_visita_realizada: string | null;
  banco: string | null;
  tipo_avaluo: string;         // '1.0' o '2.0'
  // Valuación
  valor_uv: number | null;
  valor_valuador: number | null;
  valor_final: number;
  moneda: string;
  // Firmas
  firma_uv: { nombre: string; fecha: string; imagenUrl?: string | null } | null;
  firma_valuador: { nombre: string; fecha: string; imagenUrl?: string | null } | null;
  // Comparables
  comparables: {
    municipio: string;
    estado_inmueble: string;
    superficie_construccion: number | null;
    precio: number;
    precio_m2: number | null;
    fuente: string | null;
  }[];
  // Documentos del expediente
  documentos_expediente: string[];
  // Fotos: URLs firmadas (públicas o presigned)
  fotos: {
    fachada: string | null;
    entorno: string[];
    interior: string[];
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0F172A',
  },
  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    marginBottom: 16,
  },
  brand: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 7,
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#0F172A',
    color: '#fff',
    padding: 6,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  // Folio
  folioBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0F172A',
  },
  folioLabel: {
    fontSize: 7,
    color: '#64748B',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  folioValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  // Secciones
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 8,
    color: '#0F172A',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  // Grid de datos
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    paddingVertical: 3,
    paddingRight: 8,
  },
  gridLabel: {
    fontSize: 7,
    color: '#64748B',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 9,
    color: '#0F172A',
    marginTop: 1,
  },
  // Tabla comparables
  table: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  tableCell: {
    fontSize: 7,
    color: '#334155',
  },
  // Valuación final
  valuacionBox: {
    backgroundColor: '#0F172A',
    color: '#fff',
    padding: 14,
    marginVertical: 12,
  },
  valuacionLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  valuacionMonto: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  valuacionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  valuacionMini: {
    fontSize: 8,
    color: '#94A3B8',
  },
  // Firmas
  firmasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingTop: 20,
  },
  firmaBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    paddingTop: 6,
  },
  firmaNombre: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  firmaRol: {
    fontSize: 7,
    color: '#64748B',
    marginTop: 1,
  },
  firmaFecha: {
    fontSize: 7,
    color: '#64748B',
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 6,
    color: '#94A3B8',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  // Fotos
  fotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  fotoFachada: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    marginBottom: 6,
  },
  fotoEntorno: {
    width: '49%',
    height: 100,
    objectFit: 'cover',
    marginBottom: 4,
  },
  fotoInterior: {
    width: '24%',
    height: 70,
    objectFit: 'cover',
    marginBottom: 4,
  },
  fotoCaption: {
    fontSize: 6,
    color: '#64748B',
    marginTop: 1,
  },
  // Listado de docs
  docList: {
    flexDirection: 'column',
  },
  docItem: {
    fontSize: 8,
    color: '#334155',
    paddingVertical: 2,
  },
});

function fmt(n: number | null | undefined, moneda: string): string {
  if (n == null) return '—';
  return `${moneda} $${Number(n).toLocaleString('es-MX')}`;
}

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fechaLarga(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AvaluoPdfDocument({ data }: { data: AvaluoPdfData }) {
  return (
    <Document>
      {/* PÁGINA 1: datos generales y valuación */}
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.brand}>ARQOS</Text>
            <Text style={styles.brandSubtitle}>UNIDAD DE VALUACIÓN</Text>
          </View>
          <Text style={styles.badge}>DOCUMENTO OFICIAL</Text>
        </View>

        {/* Folio */}
        <View style={styles.folioBox}>
          <Text style={styles.folioLabel}>FOLIO DEL EXPEDIENTE</Text>
          <Text style={styles.folioValue}>{data.folio || '—'}</Text>
          <Text style={{ fontSize: 7, color: '#64748B', marginTop: 2 }}>
            Emitido el {fechaLarga(data.fechaEmision)}
          </Text>
        </View>

        {/* Datos del inmueble */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. DATOS DEL INMUEBLE</Text>
          <View style={styles.grid}>
            <View style={[styles.gridItem, { width: '100%' }]}>
              <Text style={styles.gridLabel}>DIRECCIÓN</Text>
              <Text style={styles.gridValue}>{data.direccion}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>MUNICIPIO</Text>
              <Text style={styles.gridValue}>{data.municipio}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>ESTADO</Text>
              <Text style={styles.gridValue}>{data.estado_inmueble}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>TIPO DE INMUEBLE</Text>
              <Text style={styles.gridValue}>{data.tipo_inmueble.replace('_', ' ')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>USO DE SUELO</Text>
              <Text style={styles.gridValue}>{data.uso_suelo || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>SUPERFICIE TERRENO</Text>
              <Text style={styles.gridValue}>
                {data.superficie_terreno ? `${data.superficie_terreno} m²` : '—'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>SUPERFICIE CONSTRUCCIÓN</Text>
              <Text style={styles.gridValue}>
                {data.superficie_construccion ? `${data.superficie_construccion} m²` : '—'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>CLAVE CATASTRAL</Text>
              <Text style={styles.gridValue}>{data.clave_catastral || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Datos del expediente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. DATOS DEL EXPEDIENTE</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>TIPO DE AVALÚO</Text>
              <Text style={styles.gridValue}>
                {data.tipo_avaluo === '1.0' ? '1.0 — Primera Enajenación' : '2.0 — Crédito Bancario'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>BANCO</Text>
              <Text style={styles.gridValue}>{data.banco || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>FECHA DE SOLICITUD</Text>
              <Text style={styles.gridValue}>{fechaCorta(data.fecha_solicitud)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>FECHA DE VISITA</Text>
              <Text style={styles.gridValue}>{fechaCorta(data.fecha_visita_realizada)}</Text>
            </View>
          </View>
        </View>

        {/* Documentación entregada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>III. DOCUMENTACIÓN ENTREGADA</Text>
          <View style={styles.docList}>
            {data.documentos_expediente.length === 0 ? (
              <Text style={styles.docItem}>—</Text>
            ) : (
              data.documentos_expediente.map((d, i) => (
                <Text key={i} style={styles.docItem}>✓  {d}</Text>
              ))
            )}
          </View>
        </View>

        {/* Comparables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IV. COMPARABLES DEL MERCADO</Text>
          {data.comparables.length === 0 ? (
            <Text style={{ fontSize: 8, color: '#64748B' }}>Sin comparables capturados.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>UBICACIÓN</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>SUP. M²</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>PRECIO</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>$/M²</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>FUENTE</Text>
              </View>
              {data.comparables.map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '30%' }]}>
                    {c.municipio}, {c.estado_inmueble}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                    {c.superficie_construccion ?? '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    ${Number(c.precio).toLocaleString('es-MX')}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                    {c.precio_m2 ? `$${Number(c.precio_m2).toLocaleString('es-MX')}` : '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{c.fuente || '—'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Valuación final */}
        <View style={styles.valuacionBox}>
          <Text style={styles.valuacionLabel}>V. VALOR FINAL DEL AVALÚO</Text>
          <Text style={styles.valuacionMonto}>{fmt(data.valor_final, data.moneda)}</Text>
          <View style={styles.valuacionRow}>
            <Text style={styles.valuacionMini}>Valor UV: {fmt(data.valor_uv, data.moneda)}</Text>
            <Text style={styles.valuacionMini}>Valor Valuador: {fmt(data.valor_valuador, data.moneda)}</Text>
          </View>
        </View>

        {/* Firmas */}
        <View style={styles.firmasContainer}>
          <View style={styles.firmaBox}>
            {data.firma_uv?.imagenUrl && (
              <Image src={data.firma_uv.imagenUrl} style={{ height: 40, objectFit: 'contain', marginBottom: 4 }} />
            )}
            <Text style={styles.firmaNombre}>{data.firma_uv?.nombre || '—'}</Text>
            <Text style={styles.firmaRol}>UNIDAD DE VALUACIÓN (CONTROLADOR)</Text>
            <Text style={styles.firmaFecha}>
              Firmado: {data.firma_uv ? fechaLarga(data.firma_uv.fecha) : '—'}
            </Text>
          </View>
          <View style={styles.firmaBox}>
            {data.firma_valuador?.imagenUrl && (
              <Image src={data.firma_valuador.imagenUrl} style={{ height: 40, objectFit: 'contain', marginBottom: 4 }} />
            )}
            <Text style={styles.firmaNombre}>{data.firma_valuador?.nombre || '—'}</Text>
            <Text style={styles.firmaRol}>VALUADOR ASIGNADO</Text>
            <Text style={styles.firmaFecha}>
              Firmado: {data.firma_valuador ? fechaLarga(data.firma_valuador.fecha) : '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          ARQOS — Documento generado automáticamente por el sistema · ID: {data.folio || '—'}
        </Text>
      </Page>

      {/* PÁGINA 2: visita técnica con fotos */}
      {(data.fotos.fachada || data.fotos.entorno.length > 0 || data.fotos.interior.length > 0) && (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.brand}>ARQOS</Text>
              <Text style={styles.brandSubtitle}>VISITA TÉCNICA · {data.folio || '—'}</Text>
            </View>
            <Text style={styles.badge}>EVIDENCIA FOTOGRÁFICA</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FACHADA</Text>
            {data.fotos.fachada ? (
              <Image src={data.fotos.fachada} style={styles.fotoFachada} />
            ) : (
              <Text style={{ fontSize: 8, color: '#64748B' }}>Sin foto.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ENTORNO</Text>
            <View style={styles.fotosGrid}>
              {data.fotos.entorno.map((url, i) => (
                <Image key={i} src={url} style={styles.fotoEntorno} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INTERIORES</Text>
            <View style={styles.fotosGrid}>
              {data.fotos.interior.map((url, i) => (
                <Image key={i} src={url} style={styles.fotoInterior} />
              ))}
            </View>
          </View>

          <Text style={styles.footer}>
            ARQOS — Documento generado automáticamente por el sistema · ID: {data.folio || '—'}
          </Text>
        </Page>
      )}
    </Document>
  );
}
