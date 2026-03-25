// components/Legal/LegalContentES.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

const LAST_UPDATED = '15 de marzo de 2026';
const CONTACT_EMAIL = 'calminogroup@gmail.com';

const styles = StyleSheet.create({
  bodyText: { fontSize: 14, lineHeight: 24, textAlign: 'left' },
  updated: { fontSize: 12 },
  section: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  subsection: { fontSize: 14, fontWeight: '600' },
  bold: { fontWeight: '700' },
});

export const PrivacyContentES = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Versión 1.1 | Última actualización: {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Introducción{'\n'}</Text>
    Calmino ("nosotros", "la Empresa") se compromete a proteger la privacidad de sus usuarios. Esta Política de Privacidad ("la Política") explica qué datos personales recopilamos, cómo los usamos y cuáles son sus derechos.{'\n'}
    Esta Política cumple con:{'\n'}
    • Ley israelí de Protección de la Privacidad, 5741-1981 y Reglamento de Protección de la Privacidad (Seguridad de Datos), 5777-2017{'\n'}
    • Reglamento General de Protección de Datos de la UE (RGPD) 2016/679{'\n'}
    • Ley estadounidense de Protección de la Privacidad Infantil en Internet (COPPA){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Quiénes somos{'\n'}</Text>
    Calmino es una aplicación de seguimiento de salud para bebés y niños, operada y desarrollada por Calmino Group.{'\n'}
    Para consultas de privacidad: {CONTACT_EMAIL}{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Información que recopilamos{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>a. Información que usted proporciona directamente:{'\n'}</Text>
    • Datos de cuenta: nombre completo, dirección de correo electrónico, contraseña cifrada{'\n'}
    • Perfil del niño: nombre, fecha de nacimiento, género, foto de perfil{'\n'}
    • Datos de seguimiento: alimentación (hora, cantidad, tipo), sueño (horas de inicio/fin), cambios de pañal, suplementos nutricionales, vacunas, medicamentos, medidas de crecimiento (peso, altura, circunferencia de cabeza){'\n'}
    • Datos de ubicación (GPS) — para permitir el descubrimiento de niñeras cercanas, la aplicación recopila datos de ubicación (exacta y aproximada) solo con su permiso explícito y durante el uso. Estos datos no se guardan en el historial, no se venden y el permiso se puede revocar en cualquier momento.{'\n'}
    • Mensajes de chat enviados entre padres y niñeras a través de la aplicación{'\n'}
    • Notas y registros que ingresa manualmente{'\n'}
    • Fotos y momentos mágicos que elige guardar{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>b. Información recopilada automáticamente:{'\n'}</Text>
    • Tipo de dispositivo, versión del sistema operativo e identificador único del dispositivo{'\n'}
    • Token de notificaciones push (solo para enviar recordatorios){'\n'}
    • Dirección IP (solo para seguridad y solución de problemas — no almacenada a largo plazo){'\n'}
    • Usamos datos de uso anónimos e informes de fallos a través de servicios externos para identificar rápidamente errores y mejorar la estabilidad. Esta información no contiene datos de identificación.{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>c. Información de terceros:{'\n'}</Text>
    • Al iniciar sesión con Google: nombre completo y dirección de correo de su cuenta de Google{'\n'}
    • Al iniciar sesión con Apple: dirección de correo (que puede ser ocultada por Apple){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Cómo usamos su información{'\n'}</Text>
    Usamos su información únicamente para estos fines:{'\n'}
    • Proporcionar, mantener y mejorar los servicios de la aplicación{'\n'}
    • Mostrar datos personales, gráficos y estadísticas{'\n'}
    • Compartir datos con familiares y niñeras según los permisos que usted establezca{'\n'}
    • Enviar notificaciones y recordatorios que usted solicitó explícitamente{'\n'}
    • Proporcionar soporte técnico{'\n'}
    • Cumplir con obligaciones legales{'\n'}
    • Mejorar el servicio usando únicamente datos agregados y anónimos{'\n\n'}
    <Text style={styles.bold}>No</Text> usamos su información para publicidad dirigida, ni vendemos datos a entidades comerciales.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Compartir información con terceros{'\n'}</Text>
    Utilizamos proveedores de servicios externos reputables para operar la aplicación:{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> - Almacenamiento de datos, autenticación e infraestructura.{'\n'}
    • <Text style={styles.bold}>Apple</Text> - Inicio de sesión y notificaciones push.{'\n'}
    • <Text style={styles.bold}>Expo / EAS</Text> - Plataforma de desarrollo y actualizaciones.{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> - Gestión segura de suscripciones y compras.{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> - Datos meteorológicos locales.{'\n\n'}
    <Text style={styles.bold}>No</Text> vendemos, alquilamos, intercambiamos ni comercializamos su información de ninguna manera.{'\n'}
    Solo divulgaremos información si: (1) requerido por una orden judicial válida; (2) requerido por ley; (3) necesario para proteger la seguridad pública.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Transferencias internacionales de datos{'\n'}</Text>
    Sus datos se almacenan en servidores de Google Firebase que pueden estar ubicados en EE.UU. y/o Europa. Firebase cumple con los requisitos del RGPD y proporciona garantías adecuadas. Al usar el servicio, usted consiente esta transferencia.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Seguridad de datos{'\n'}</Text>
    Empleamos diversas medidas de seguridad:{'\n'}
    • Cifrado de todos los datos en tránsito (TLS 1.2+){'\n'}
    • Cifrado de datos en reposo mediante Firebase Security Rules{'\n'}
    • Controles de acceso estrictos — cada usuario solo puede acceder a sus propios datos{'\n'}

    • Monitoreo de anomalías y registro de eventos de seguridad{'\n\n'}
    Importante: ningún sistema digital es completamente seguro. Si sospecha una brecha de seguridad, notifíquenos inmediatamente a {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Retención de datos{'\n'}</Text>
    • Conservamos sus datos mientras su cuenta esté activa{'\n'}
    • Al eliminar la cuenta: los datos personales se <Text style={styles.bold}>eliminan inmediatamente</Text>{'\n'}
    • Las copias de seguridad técnicas pueden conservarse hasta <Text style={styles.bold}>90 días</Text>{'\n'}
    • La información requerida por ley se conservará por el período legalmente establecido{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Privacidad de los niños{'\n'}</Text>
    El servicio es exclusivamente para padres y cuidadores (16+). La información sobre niños se recopila únicamente:{'\n'}
    • Por iniciativa directa, ingreso y bajo el control total de sus padres / tutores legales{'\n'}
    • Solo con fines de seguimiento de salud personal, sin intercambio comercial ni publicidad dirigida{'\n\n'}
    Como padre, conserva el derecho absoluto de eliminar todos los datos de sus hijos de nuestros servidores de forma permanente e inmediata ("Derecho al olvido") a través de la App. Nunca recopilamos información directamente de los niños.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Sus derechos{'\n'}</Text>
    Según la ley israelí de protección de privacidad y el RGPD, usted tiene:{'\n'}
    • <Text style={styles.bold}>Derecho de acceso</Text> — obtener una copia de la información que tenemos sobre usted{'\n'}
    • <Text style={styles.bold}>Derecho de rectificación</Text> — corregir información inexacta o desactualizada{'\n'}
    • <Text style={styles.bold}>Derecho de supresión</Text> — el "derecho al olvido" — eliminar todos sus datos{'\n'}
    • <Text style={styles.bold}>Derecho a la portabilidad</Text> — recibir sus datos en formato legible por máquina{'\n'}
    • <Text style={styles.bold}>Derecho de oposición</Text> — oponerse a cierto procesamiento de sus datos{'\n'}
    • <Text style={styles.bold}>Retirar consentimiento</Text> — retirar el consentimiento otorgado en cualquier momento{'\n\n'}
    Para ejercer sus derechos: {CONTACT_EMAIL} — responderemos en un plazo de <Text style={styles.bold}>30 días</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Cambios en esta política{'\n'}</Text>
    Le notificaremos cambios importantes a través de la aplicación y/o por correo electrónico con al menos <Text style={styles.bold}>30 días</Text> de antelación.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Contáctenos{'\n'}</Text>
    Para preguntas, solicitudes o quejas relacionadas con la privacidad:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

export const TermsContentES = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Versión 1.1 | Última actualización: {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Aceptación de los términos{'\n'}</Text>
    Al descargar, instalar o usar la aplicación Calmino ("la App" / "el Servicio"), usted acepta estos Términos de Servicio ("los Términos"). Si no está de acuerdo, deje de usar la aplicación inmediatamente y elimínela.{'\n'}
    Estos Términos constituyen un acuerdo legal vinculante entre usted y Calmino.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Descripción del servicio{'\n'}</Text>
    Calmino es una aplicación de seguimiento de salud para bebés y niños que permite:{'\n'}
    • Seguimiento de alimentación, sueño, pañales, suplementos, vacunas y medicamentos{'\n'}
    • Medición de indicadores y curvas de crecimiento{'\n'}
    • Compartir datos con familiares y niñeras{'\n'}
    • Creación de estadísticas, informes y análisis{'\n'}
    • Registro de momentos mágicos e hitos{'\n'}
    • Gestión de recordatorios y notificaciones personalizadas{'\n'}
    • Servicios de búsqueda de niñeras, coordinación de reservas y mensajería{'\n\n'}
    <Text style={styles.bold}>Edad mínima de uso: 16 años.</Text> El servicio no está destinado a usuarios menores de 16 años.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Cuenta de usuario{'\n'}</Text>
    3.1 <Text style={styles.bold}>Registro:</Text> Debe proporcionar información veraz, precisa y actualizada.{'\n'}
    3.2 <Text style={styles.bold}>Seguridad:</Text> Usted es responsable de mantener la confidencialidad de su contraseña.{'\n'}
    3.3 <Text style={styles.bold}>Cuenta única:</Text> Cada persona puede tener solo una cuenta personal.{'\n'}
    3.4 <Text style={styles.bold}>Responsabilidad:</Text> Usted es el único responsable de toda actividad en su cuenta.{'\n'}
    3.5 <Text style={styles.bold}>Eliminación:</Text> Puede eliminar su cuenta en cualquier momento desde Configuración.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Uso permitido y prohibido{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Permitido:{'\n'}</Text>
    • Uso personal y familiar para gestionar el cuidado de sus hijos{'\n'}
    • Compartir datos con familiares y niñeras autorizados{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>Estrictamente prohibido:{'\n'}</Text>
    • Uso comercial sin licencia escrita{'\n'}
    • Subir contenido ilegal, ofensivo, engañoso o que viole derechos{'\n'}
    • Intentar acceder a datos de otros usuarios sin autorización{'\n'}
    • Ingeniería inversa, desensamblaje o copia del código{'\n'}
    • Uso de bots, scripts o herramientas automatizadas{'\n'}
    • Distribución de spam, malware o contenido malicioso{'\n'}
    • Uso para acoso o violación de la privacidad de otros{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Contenido del usuario{'\n'}</Text>
    La información que ingresa (fotos, notas, registros) sigue siendo de su propiedad. Al cargarla, nos otorga una licencia limitada y no exclusiva para almacenar, respaldar y mostrar únicamente para proporcionar el servicio.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Servicio Premium{'\n'}</Text>
    6.1 Calmino ofrece planes de suscripción de pago ("Premium") con funciones mejoradas.{'\n'}
    6.2 Los pagos se procesan a través de <Text style={styles.bold}>Apple App Store</Text> o <Text style={styles.bold}>Google Play Store</Text> exclusivamente.{'\n'}
    6.3 Las suscripciones se <Text style={styles.bold}>renuevan automáticamente</Text>; cancelable en cualquier momento en la configuración de la tienda.{'\n'}
    6.4 No se emitirán reembolsos por períodos utilizados, salvo que la ley lo requiera.{'\n'}
    6.5 Nos reservamos el derecho de cambiar precios con <Text style={styles.bold}>30 días</Text> de aviso previo.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Servicios de terceros{'\n'}</Text>
    La aplicación depende de servicios externos:{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> - Almacenamiento, autenticación e infraestructura{'\n'}
    • <Text style={styles.bold}>Apple</Text> - Autenticación y notificaciones push{'\n'}
    • <Text style={styles.bold}>Expo / EAS</Text> - Plataforma de desarrollo y actualizaciones{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> - Gestión de suscripciones y compras{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> - Datos meteorológicos{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Limitación de responsabilidad, descargo médico y servicios de niñera{'\n'}</Text>
    8.1 El servicio se proporciona <Text style={styles.bold}>"tal cual"</Text> sin garantía de ningún tipo.{'\n'}
    8.2 <Text style={styles.bold}>La aplicación no reemplaza el consejo médico profesional.</Text> Consulte siempre a un pediatra calificado.{'\n'}
    8.3 <Text style={styles.bold}>Mercado de Niñeras — Renuncia Absoluta de Responsabilidad:</Text> Calmino proporciona una plataforma digital ("tablón de anuncios") que conecta a padres con niñeras independientes. <Text style={styles.bold}>La Empresa no es una agencia de empleo, no emplea a las niñeras, no las entrevista, no realiza verificaciones de antecedentes, integridad o antecedentes penales de ningún tipo, y no las respalda.</Text> Cualquier compromiso, empleo o encuentro facilitado a través de la App se realiza bajo el riesgo y responsabilidad exclusivos de los padres. Es su estricta obligación actuar con debida diligencia, solicitar identificación y verificar referencias antes de confiarles a sus hijos.{'\n'}
    <Text style={styles.bold}>Renuncia Completa:</Text> Al usar la App para encontrar a una niñera, usted renuncia por la presente de manera completa, definitiva e irrevocable a cualquier reclamo, demanda o demanda contra Calmino, sus directores o empleados por cualquier daño directo o indirecto, daño corporal, daño a la propiedad, robo, negligencia o acto criminal causado por una niñera encontrada a través de la plataforma.{'\n'}
    8.4 Calmino no es responsable de daños directos, indirectos, incidentales, especiales o consecuentes.{'\n'}
    8.5 Nuestra responsabilidad total no excederá el monto pagado en el último año, o 200 ₪ — lo que sea menor.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Propiedad intelectual{'\n'}</Text>
    Todos los derechos de la aplicación son propiedad exclusiva de Calmino y están protegidos por leyes de derechos de autor, marcas y patentes.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Terminación y suspensión de cuenta{'\n'}</Text>
    Nos reservamos el derecho de suspender o cerrar cuentas que violen los Términos.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Indemnización{'\n'}</Text>
    Usted acepta indemnizar a Calmino de cualquier reclamación derivada de su uso del servicio.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Cambios en los términos{'\n'}</Text>
    Le notificaremos cambios importantes con al menos <Text style={styles.bold}>30 días</Text> de antelación.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>13. Divisibilidad{'\n'}</Text>
    Si alguna disposición se considera inválida, será reemplazada por una disposición válida con intención similar.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>14. Ley aplicable y resolución de disputas{'\n'}</Text>
    Estos Términos se rigen por las leyes del Estado de Israel. Cualquier disputa se resolverá en los tribunales competentes <Text style={styles.bold}>del distrito de Tel Aviv-Jaffa exclusivamente</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>15. Contáctenos{'\n'}</Text>
    Para preguntas, quejas o solicitudes legales:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);
