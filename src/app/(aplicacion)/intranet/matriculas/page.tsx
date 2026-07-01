'use client';

import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { functions, storage } from '@/lib/firebase';

interface SemestreOption {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  anioTitulo?: string | null;
}

interface PaqueteOption {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  grupoIds?: number[];
}

interface UploadedImage {
  path: string;
  url: string;
  contentType: string;
}

interface MatriculaFormValues {
  semestreId: string;
  tipoDocumento: 'DNI' | 'CE';
  dni: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre: string;
  sexo: 'F' | 'M';
  nacionalidad: string;
  fechaNacimiento: string;
  estadoCivil: string;
  instruccion: string;
  direccion: string;
  distrito: string;
  celular: string;
  telefono: string;
  email: string;
  recibo: string;
  paqueteId: string;
}

interface VerificarDocumentoResponse {
  userExists?: boolean;
  userHasStoredImages?: boolean;
  datos?: Partial<MatriculaFormValues>;
}

const initialValues: MatriculaFormValues = {
  semestreId: '',
  tipoDocumento: 'DNI',
  dni: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  nombre: '',
  sexo: 'F',
  nacionalidad: 'PERUANA',
  fechaNacimiento: '',
  estadoCivil: 'Soltero',
  instruccion: 'Secundaria',
  direccion: '',
  distrito: '',
  celular: '',
  telefono: '',
  email: '',
  recibo: '',
  paqueteId: '',
};

const steps = ['Documento de Identidad', 'Datos de Usuario', 'Datos de los Cursos'];

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { message?: string } | null)?.message;
  return message || fallback;
};

const normalizeDocumentNumber = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-');

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

export default function MatriculasPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<MatriculaFormValues>(initialValues);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([]);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<UploadedImage | null>(null);
  const [backImage, setBackImage] = useState<UploadedImage | null>(null);
  const [documentVerified, setDocumentVerified] = useState(false);
  const [isExistingUserWithImages, setIsExistingUserWithImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSemestreId = Number(values.semestreId || 0);

  const selectedSemestreLabel = useMemo(() => {
    const semestre = semestres.find((item) => String(item.id) === values.semestreId);
    return semestre?.titulo || semestre?.nombre || (semestre?.id ? `Semestre ${semestre.id}` : '');
  }, [semestres, values.semestreId]);

  const updateValue = useCallback(<K extends keyof MatriculaFormValues>(key: K, value: MatriculaFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
    setSuccessMessage(null);
    if (key === 'semestreId' || key === 'tipoDocumento' || key === 'dni') {
      setDocumentVerified(false);
      setIsExistingUserWithImages(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSemestres = async () => {
      setLoadingOptions(true);
      try {
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const result = await listSemestres();
        if (mounted) setSemestres(result.data.semestres || []);
      } catch (error) {
        if (mounted) setMessage(getCallableErrorMessage(error, 'No se pudieron cargar los periodos.'));
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };
    void loadSemestres();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPaquetes = async () => {
      setPaquetes([]);
      updateValue('paqueteId', '');
      if (!selectedSemestreId) return;

      setLoadingOptions(true);
      try {
        const listPaquetes = httpsCallable<{ semestreId: number }, { paquetes?: PaqueteOption[] }>(
          functions,
          'listMatriculaPaquetesBySemestre',
        );
        const result = await listPaquetes({ semestreId: selectedSemestreId });
        if (mounted) setPaquetes(result.data.paquetes || []);
      } catch (error) {
        if (mounted) setMessage(getCallableErrorMessage(error, 'No se pudieron cargar los modulos del periodo.'));
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };
    void loadPaquetes();
    return () => {
      mounted = false;
    };
  }, [selectedSemestreId, updateValue]);

  const uploadDocumentImage = async (file: File, side: 'frente' | 'reverso'): Promise<UploadedImage> => {
    const cleanDni = normalizeDocumentNumber(values.dni);
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = [
      'matriculas',
      'documentos',
      `${values.tipoDocumento}-${cleanDni}-${side}-${Date.now()}-${sanitizeFileName(file.name || `documento.${extension}`)}`,
    ].join('/');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    return { path, url, contentType: file.type || 'image/jpeg' };
  };

  const validateSectionOne = () => {
    if (!values.semestreId) return 'Selecciona un periodo.';
    if (!values.tipoDocumento) return 'Selecciona el tipo de documento.';
    if (!normalizeDocumentNumber(values.dni)) return 'Ingresa el numero de documento.';
    return null;
  };

  const handleVerifyDocument = async () => {
    const sectionError = validateSectionOne();
    if (sectionError) {
      setMessage(sectionError);
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const uploadedFront = frontFile && !frontImage ? await uploadDocumentImage(frontFile, 'frente') : frontImage;
      const uploadedBack = backFile && !backImage ? await uploadDocumentImage(backFile, 'reverso') : backImage;
      if (uploadedFront) setFrontImage(uploadedFront);
      if (uploadedBack) setBackImage(uploadedBack);

      const verificarDocumento = httpsCallable<
        {
          tipoDocumento: string;
          dni: string;
          frente?: UploadedImage | null;
          reverso?: UploadedImage | null;
        },
        VerificarDocumentoResponse
      >(functions, 'verificarDocumentoMatricula', { timeout: 60000 });
      const result = await verificarDocumento({
        tipoDocumento: values.tipoDocumento,
        dni: normalizeDocumentNumber(values.dni),
        frente: uploadedFront,
        reverso: uploadedBack,
      });
      const datos = result.data.datos || {};
      setValues((prev) => ({
        ...prev,
        tipoDocumento: datos.tipoDocumento === 'CE' ? 'CE' : prev.tipoDocumento,
        dni: asString(datos.dni) || prev.dni,
        apellidoPaterno: asString(datos.apellidoPaterno) || prev.apellidoPaterno,
        apellidoMaterno: asString(datos.apellidoMaterno) || prev.apellidoMaterno,
        nombre: asString(datos.nombre) || prev.nombre,
        sexo: datos.sexo === 'M' ? 'M' : datos.sexo === 'F' ? 'F' : prev.sexo,
        nacionalidad: asString(datos.nacionalidad) || prev.nacionalidad || 'PERUANA',
        fechaNacimiento: asString(datos.fechaNacimiento).split('T')[0] || prev.fechaNacimiento,
        estadoCivil: asString(datos.estadoCivil) || prev.estadoCivil,
        instruccion: asString(datos.instruccion) || prev.instruccion,
        direccion: asString(datos.direccion) || prev.direccion,
        distrito: asString(datos.distrito) || prev.distrito,
      }));
      setDocumentVerified(true);
      setIsExistingUserWithImages(Boolean(result.data.userExists && result.data.userHasStoredImages));
      setActiveStep(1);
      setSuccessMessage(
        result.data.userExists
          ? 'Documento verificado. Se cargaron los datos guardados del usuario.'
          : 'Documento verificado. Revisa y completa los datos del usuario.',
      );
    } catch (error) {
      setMessage(getCallableErrorMessage(error, 'No se pudo verificar el documento.'));
    } finally {
      setLoading(false);
    }
  };

  const validateSectionTwo = () => {
    const required: Array<[keyof MatriculaFormValues, string]> = [
      ['apellidoPaterno', 'Apellido Paterno'],
      ['apellidoMaterno', 'Apellido Materno'],
      ['nombre', 'Nombres'],
      ['sexo', 'Sexo'],
      ['nacionalidad', 'Nacionalidad'],
      ['fechaNacimiento', 'Fecha de Nacimiento'],
      ['estadoCivil', 'Estado Civil'],
      ['instruccion', 'Grado de Instruccion'],
      ['direccion', 'Domicilio Direccion'],
      ['distrito', 'Domicilio Distrito'],
      ['celular', 'Numero de Celular'],
      ['recibo', 'Numero de recibo'],
    ];
    const missing = required.find(([key]) => !String(values[key] || '').trim());
    if (missing) return `Completa ${missing[1]}.`;
    if (!/^\d{9}$/.test(values.celular.trim())) return 'El celular debe tener 9 digitos.';
    return null;
  };

  const handleGoToCourses = () => {
    const sectionError = validateSectionTwo();
    if (sectionError) {
      setMessage(sectionError);
      return;
    }
    setMessage(null);
    setActiveStep(2);
  };

  const handleSubmit = async () => {
    if (!documentVerified) {
      setMessage('Primero verifica el documento de identidad.');
      setActiveStep(0);
      return;
    }
    const sectionTwoError = validateSectionTwo();
    if (sectionTwoError) {
      setMessage(sectionTwoError);
      setActiveStep(1);
      return;
    }
    if (!values.paqueteId) {
      setMessage('Selecciona un modulo.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const crearMatricula = httpsCallable<Record<string, unknown>, { id?: number }>(
        functions,
        'crearMatriculaFormulario',
        { timeout: 60000 },
      );
      await crearMatricula({
        ...values,
        dni: normalizeDocumentNumber(values.dni),
        semestreId: Number(values.semestreId),
        paqueteId: Number(values.paqueteId),
        dniImagenFrente: isExistingUserWithImages ? null : frontImage,
        dniImagenReverso: isExistingUserWithImages ? null : backImage,
      });
      setSuccessMessage('Matricula registrada correctamente.');
      setValues(initialValues);
      setFrontFile(null);
      setBackFile(null);
      setFrontImage(null);
      setBackImage(null);
      setDocumentVerified(false);
      setIsExistingUserWithImages(false);
      setActiveStep(0);
    } catch (error) {
      setMessage(getCallableErrorMessage(error, 'No se pudo registrar la matricula.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (side: 'frente' | 'reverso') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (side === 'frente') {
      setFrontFile(file);
      setFrontImage(null);
    } else {
      setBackFile(file);
      setBackImage(null);
    }
    setDocumentVerified(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Formulario de Matricula</Typography>
          <Typography variant="body2" color="text.secondary">{selectedSemestreLabel || 'Selecciona un periodo para iniciar.'}</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Stack spacing={2.5}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {loading && <LinearProgress />}
            {message && <Alert severity="error">{message}</Alert>}
            {successMessage && <Alert severity="success">{successMessage}</Alert>}

            {activeStep === 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Periodo</InputLabel>
                  <Select
                    label="Periodo"
                    value={values.semestreId}
                    onChange={(event) => updateValue('semestreId', String(event.target.value))}
                    disabled={loadingOptions || loading}
                  >
                    {semestres.map((semestre) => (
                      <MenuItem key={semestre.id} value={String(semestre.id)}>
                        {semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Tipo documento</InputLabel>
                  <Select
                    label="Tipo documento"
                    value={values.tipoDocumento}
                    onChange={(event) => updateValue('tipoDocumento', event.target.value === 'CE' ? 'CE' : 'DNI')}
                    disabled={loading}
                  >
                    <MenuItem value="DNI">DNI</MenuItem>
                    <MenuItem value="CE">CE</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Numero de DNI"
                  value={values.dni}
                  onChange={(event) => updateValue('dni', normalizeDocumentNumber(event.target.value))}
                  disabled={loading}
                  fullWidth
                />
                <Button component="label" variant="outlined" disabled={loading}>
                  {frontFile ? frontFile.name : 'Imagen dni frente'}
                  <input type="file" accept="image/*" hidden onChange={handleFileChange('frente')} />
                </Button>
                <Button component="label" variant="outlined" disabled={loading}>
                  {backFile ? backFile.name : 'Imagen dni reverso'}
                  <input type="file" accept="image/*" hidden onChange={handleFileChange('reverso')} />
                </Button>
                <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" onClick={handleVerifyDocument} disabled={loading}>
                    Verificar y continuar
                  </Button>
                </Box>
              </Box>
            )}

            {activeStep === 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <TextField label="Apellido Paterno" value={values.apellidoPaterno} onChange={(event) => updateValue('apellidoPaterno', event.target.value)} fullWidth />
                <TextField label="Apellido Materno" value={values.apellidoMaterno} onChange={(event) => updateValue('apellidoMaterno', event.target.value)} fullWidth />
                <TextField label="Nombres" value={values.nombre} onChange={(event) => updateValue('nombre', event.target.value)} fullWidth />
                <FormControl>
                  <FormLabel>Sexo</FormLabel>
                  <RadioGroup row value={values.sexo} onChange={(event) => updateValue('sexo', event.target.value === 'M' ? 'M' : 'F')}>
                    <FormControlLabel value="F" control={<Radio />} label="Femenino" />
                    <FormControlLabel value="M" control={<Radio />} label="Masculino" />
                  </RadioGroup>
                </FormControl>
                <TextField label="Nacionalidad" value={values.nacionalidad} onChange={(event) => updateValue('nacionalidad', event.target.value)} fullWidth />
                <TextField label="Fecha de Nacimiento" type="date" value={values.fechaNacimiento} onChange={(event) => updateValue('fechaNacimiento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                <FormControl fullWidth>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select label="Estado Civil" value={values.estadoCivil} onChange={(event) => updateValue('estadoCivil', String(event.target.value))}>
                    <MenuItem value="Soltero">Soltero</MenuItem>
                    <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                    <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                    <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Grado de Instruccion</InputLabel>
                  <Select label="Grado de Instruccion" value={values.instruccion} onChange={(event) => updateValue('instruccion', String(event.target.value))}>
                    <MenuItem value="Primaria">Primaria</MenuItem>
                    <MenuItem value="Secundaria">Secundaria</MenuItem>
                    <MenuItem value="Superior">Superior</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Domicilio Direccion" value={values.direccion} onChange={(event) => updateValue('direccion', event.target.value)} fullWidth />
                <TextField label="Domicilio Distrito" value={values.distrito} onChange={(event) => updateValue('distrito', event.target.value)} fullWidth />
                <TextField label="Numero de Celular" value={values.celular} onChange={(event) => updateValue('celular', event.target.value.replace(/\D/g, '').slice(0, 9))} fullWidth />
                <TextField label="Numero de Telefono Fijo" value={values.telefono} onChange={(event) => updateValue('telefono', event.target.value)} fullWidth />
                <TextField label="Correo Electronico" type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} fullWidth />
                <TextField label="Numero de recibo" value={values.recibo} onChange={(event) => updateValue('recibo', event.target.value)} fullWidth />
                <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setActiveStep(0)} disabled={loading}>Volver</Button>
                  <Button variant="contained" onClick={handleGoToCourses} disabled={loading}>Continuar</Button>
                </Box>
              </Box>
            )}

            {activeStep === 2 && (
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Seleccione un Modulo</InputLabel>
                  <Select
                    label="Seleccione un Modulo"
                    value={values.paqueteId}
                    onChange={(event) => updateValue('paqueteId', String(event.target.value))}
                    disabled={loadingOptions || loading}
                  >
                    {paquetes.map((paquete) => (
                      <MenuItem key={paquete.id} value={String(paquete.id)}>
                        {paquete.titulo || `Modulo ${paquete.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {paquetes.length === 0 && values.semestreId && !loadingOptions && (
                  <Alert severity="warning">No hay modulos disponibles para este periodo.</Alert>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setActiveStep(1)} disabled={loading}>Volver</Button>
                  <Button variant="contained" onClick={handleSubmit} disabled={loading || paquetes.length === 0}>
                    Registrar Matricula
                  </Button>
                </Box>
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
