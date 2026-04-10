import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  subheader: { fontSize: 10, color: '#666', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  row: { flexDirection: 'row', marginBottom: 3, alignItems: 'center' },
  checkbox: { width: 12, height: 12, borderWidth: 1, borderColor: '#333', marginRight: 8 },
  label: { flex: 1, fontSize: 9 },
  note: { fontSize: 8, color: '#888', marginTop: 2, marginLeft: 20 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 7, color: '#aaa', textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  infoLabel: { fontSize: 9, fontWeight: 'bold', color: '#444' },
  infoValue: { fontSize: 9, color: '#222' },
});

interface Props {
  folio: string;
  direccion: string;
  propietario: string | null;
  fechaVisita: string | null;
}

export default function ChecklistVisitaPdf({ folio, direccion, propietario, fechaVisita }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Text style={s.header}>CHECKLIST DE VISITA — ARQOS</Text>
        <Text style={s.subheader}>Proceso Avalúo Bancario 1ra Enajenación</Text>

        {/* Datos del expediente */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DATOS DEL EXPEDIENTE</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Folio:</Text>
            <Text style={s.infoValue}>{folio || '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Dirección:</Text>
            <Text style={s.infoValue}>{direccion || '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Propietario:</Text>
            <Text style={s.infoValue}>{propietario || '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha visita:</Text>
            <Text style={s.infoValue}>{fechaVisita || '—'}</Text>
          </View>
        </View>

        {/* Fotografías requeridas */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FOTOGRAFÍAS REQUERIDAS (todas georeferenciadas)</Text>
          {[
            '1 foto de FACHADA principal',
            '1 foto para PORTADA del avalúo',
            '2 fotos de ENTORNO (calle de ambos lados)',
            '5 a 8 fotos de INTERIORES (diferentes puntos del inmueble)',
          ].map((item, i) => (
            <View key={i} style={s.row}>
              <View style={s.checkbox} />
              <Text style={s.label}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Verificación de servicios */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>VERIFICACIÓN DE SERVICIOS</Text>
          {[
            { label: 'Agua', opciones: 'Municipal / Pozo / Pipa / No hay' },
            { label: 'Luz (CFE)', opciones: 'CFE / Planta solar / No hay' },
            { label: 'Alumbrado público', opciones: 'Sí / No / Parcial' },
            { label: 'Banquetas', opciones: 'Sí / No / Parcial' },
            { label: 'Tipo de calles', opciones: 'Pavimentada / Empedrado / Terracería / Concreto' },
            { label: 'Teléfono / Internet', opciones: 'Fibra / Cable / Inalámbrico / No hay' },
          ].map((s2, i) => (
            <View key={i}>
              <View style={s.row}>
                <View style={s.checkbox} />
                <Text style={s.label}>{s2.label}: _______________</Text>
              </View>
              <Text style={s.note}>Opciones: {s2.opciones}</Text>
            </View>
          ))}
        </View>

        {/* Observaciones generales */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>OBSERVACIONES GENERALES</Text>
          <View style={{ height: 80, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 }} />
        </View>

        {/* Firmas */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
          <View style={{ width: '45%' }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 4, height: 40 }} />
            <Text style={{ fontSize: 8, textAlign: 'center' }}>Firma del Valuador</Text>
          </View>
          <View style={{ width: '45%' }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 4, height: 40 }} />
            <Text style={{ fontSize: 8, textAlign: 'center' }}>Firma del Propietario / Representante</Text>
          </View>
        </View>

        <Text style={s.footer}>
          ARQOS — Sistema de Valuación · Unidad de Valuación · Generado automáticamente · {new Date().toLocaleDateString('es-MX')}
        </Text>
      </Page>
    </Document>
  );
}
