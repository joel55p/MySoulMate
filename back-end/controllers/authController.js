const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, runTransaction, formatNeo4jResults } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mysoulmate_secret_key_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// Validación de email universitario
const UNIVERSITY_DOMAINS = [
  'uvg.edu.gt',
  'url.edu.gt', 
  'unis.edu.gt',
  'ufm.edu',
  'student.universidad.edu'
];

const validateUniversityEmail = (email) => {
  const domain = email.split('@')[1];
  return UNIVERSITY_DOMAINS.some(uniDomain => 
    domain === uniDomain || domain.endsWith('.' + uniDomain)
  );
};

// Generar JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

// Verificar JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Registro de usuario
const register = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      confirmPassword, 
      age, 
      university,
      career,
      semester
    } = req.body;

    // Validaciones básicas
    if (!name || !email || !password || !confirmPassword || !age || !university) {
      return res.status(400).json({ 
        error: 'Todos los campos son obligatorios',
        details: 'Nombre, email, contraseña, edad y universidad son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido',
        details: 'Ingresa un email válido'
      });
    }

    // Validar email universitario
    if (!validateUniversityEmail(email)) {
      return res.status(400).json({ 
        error: 'Email universitario requerido',
        details: 'Debes usar tu email universitario oficial',
        acceptedDomains: UNIVERSITY_DOMAINS
      });
    }

    // Validar contraseñas
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        error: 'Las contraseñas no coinciden',
        details: 'Verifica que ambas contraseñas sean idénticas'
      });
    }

    // Validar fortaleza de contraseña
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Contraseña muy débil',
        details: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Validar edad
    if (age < 18 || age > 35) {
      return res.status(400).json({ 
        error: 'Edad fuera del rango permitido',
        details: 'Debes tener entre 18 y 35 años'
      });
    }

    // Verificar si el email ya existe
    const existingUserQuery = `
      MATCH (u:User {email: $email})
      RETURN u
    `;
    
    const existingUser = await runQuery(existingUserQuery, { email });
    if (existingUser.records.length > 0) {
      return res.status(409).json({ 
        error: 'Email ya registrado',
        details: 'Este email ya está asociado a una cuenta'
      });
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generar ID único
    const userId = uuidv4();

    // Crear usuario en Neo4j
    const createUserQuery = `
      CREATE (u:User {
        id: $id,
        name: $name,
        email: $email,
        hashedPassword: $hashedPassword,
        age: $age,
        university: $university,
        career: $career,
        semester: $semester,
        profileComplete: false,
        emailVerified: false,
        showPhoto: false,
        isActive: true,
        createdAt: datetime(),
        updatedAt: datetime(),
        lastLogin: null
      })
      RETURN u
    `;

    const result = await runQuery(createUserQuery, {
      id: userId,
      name,
      email,
      hashedPassword,
      age: parseInt(age),
      university,
      career: career || null,
      semester: semester || null
    });

    if (result.records.length === 0) {
      return res.status(500).json({ 
        error: 'Error al crear usuario',
        details: 'No se pudo registrar el usuario en la base de datos'
      });
    }

    // Generar token JWT
    const token = generateToken(userId);

    // Respuesta exitosa (sin incluir datos sensibles)
    const userData = result.records[0].get('u').properties;
    delete userData.hashedPassword;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: userData,
      token,
      nextStep: 'questionnaire'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo completar el registro'
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Credenciales incompletas',
        details: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const userQuery = `
      MATCH (u:User {email: $email, isActive: true})
      RETURN u
    `;

    const result = await runQuery(userQuery, { email });
    
    if (result.records.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        details: 'Email o contraseña incorrectos'
      });
    }

    const userData = result.records[0].get('u').properties;

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, userData.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        details: 'Email o contraseña incorrectos'
      });
    }

    // Actualizar último login
    const updateLoginQuery = `
      MATCH (u:User {id: $userId})
      SET u.lastLogin = datetime(), u.updatedAt = datetime()
      RETURN u
    `;

    await runQuery(updateLoginQuery, { userId: userData.id });

    // Generar token JWT
    const token = generateToken(userData.id);

    // Respuesta exitosa (sin incluir datos sensibles)
    delete userData.hashedPassword;

    // Determinar siguiente paso según estado del perfil
    let nextStep = 'dashboard';
    if (!userData.profileComplete) {
      nextStep = 'questionnaire';
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      user: userData,
      token,
      nextStep
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo completar el login'
    });
  }
};

// Obtener perfil del usuario
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Viene del middleware de auth

    const profileQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      OPTIONAL MATCH (u)-[:LIKES]->(i:Interest)
      RETURN u, collect(i.name) as interests
    `;

    const result = await runQuery(profileQuery, { userId });
    
    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        details: 'El perfil solicitado no existe'
      });
    }

    const userData = result.records[0].get('u').properties;
    const interests = result.records[0].get('interests');

    // Remover datos sensibles
    delete userData.hashedPassword;

    res.json({
      success: true,
      user: {
        ...userData,
        interests: interests.filter(interest => interest !== null)
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo obtener el perfil'
    });
  }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      age,
      university,
      career,
      semester,
      description,
      interests,
      showPhoto
    } = req.body;

    // Validaciones
    if (age && (age < 18 || age > 35)) {
      return res.status(400).json({ 
        error: 'Edad fuera del rango permitido',
        details: 'Debes tener entre 18 y 35 años'
      });
    }

    // Construir consulta de actualización dinámicamente
    let updateFields = [];
    let params = { userId };

    if (name) {
      updateFields.push('u.name = $name');
      params.name = name;
    }
    if (age) {
      updateFields.push('u.age = $age');
      params.age = parseInt(age);
    }
    if (university) {
      updateFields.push('u.university = $university');
      params.university = university;
    }
    if (career) {
      updateFields.push('u.career = $career');
      params.career = career;
    }
    if (semester) {
      updateFields.push('u.semester = $semester');
      params.semester = semester;
    }
    if (description) {
      updateFields.push('u.description = $description');
      params.description = description;
    }
    if (showPhoto !== undefined) {
      updateFields.push('u.showPhoto = $showPhoto');
      params.showPhoto = showPhoto;
    }

    // Actualizar timestamp
    updateFields.push('u.updatedAt = datetime()');

    if (updateFields.length === 1) { // Solo el timestamp
      return res.status(400).json({ 
        error: 'No hay campos para actualizar',
        details: 'Debes proporcionar al menos un campo para modificar'
      });
    }

    // Ejecutar actualización del perfil
    const updateQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      SET ${updateFields.join(', ')}
      RETURN u
    `;

    const result = await runQuery(updateQuery, params);

    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        details: 'No se pudo actualizar el perfil'
      });
    }

    // Actualizar intereses si se proporcionan
    if (interests && Array.isArray(interests)) {
      // Eliminar intereses existentes
      await runQuery(`
        MATCH (u:User {id: $userId})-[r:LIKES]->(i:Interest)
        DELETE r
      `, { userId });

      // Agregar nuevos intereses
      for (const interestName of interests) {
        if (interestName && interestName.trim()) {
          await runQuery(`
            MATCH (u:User {id: $userId})
            MERGE (i:Interest {name: $interestName})
            MERGE (u)-[:LIKES {rating: 5, createdAt: datetime()}]->(i)
          `, { 
            userId, 
            interestName: interestName.trim() 
          });
        }
      }
    }

    // Obtener perfil actualizado con intereses
    const updatedProfileQuery = `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:LIKES]->(i:Interest)
      RETURN u, collect(i.name) as interests
    `;

    const updatedResult = await runQuery(updatedProfileQuery, { userId });
    const userData = updatedResult.records[0].get('u').properties;
    const userInterests = updatedResult.records[0].get('interests');

    // Remover datos sensibles
    delete userData.hashedPassword;

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        ...userData,
        interests: userInterests.filter(interest => interest !== null)
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo actualizar el perfil'
    });
  }
};

// Completar cuestionario y marcar perfil como completo
const completeQuestionnaire = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { interests, personalityTraits, preferences } = req.body;

    // Validaciones
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ 
        error: 'Intereses requeridos',
        details: 'Debes seleccionar al menos un interés'
      });
    }

    if (interests.length > 20) {
      return res.status(400).json({ 
        error: 'Demasiados intereses',
        details: 'Máximo 20 intereses permitidos'
      });
    }

    // Usar transacción para garantizar consistencia
    const result = await runTransaction(async (tx) => {
      // Marcar perfil como completo
      await tx.run(`
        MATCH (u:User {id: $userId})
        SET u.profileComplete = true, u.updatedAt = datetime()
        RETURN u
      `, { userId });

      // Eliminar intereses existentes
      await tx.run(`
        MATCH (u:User {id: $userId})-[r:LIKES]->(i:Interest)
        DELETE r
      `, { userId });

      // Agregar nuevos intereses
      for (const interest of interests) {
        if (interest && interest.name) {
          await tx.run(`
            MATCH (u:User {id: $userId})
            MERGE (i:Interest {name: $interestName})
            ON CREATE SET i.category = $category, i.createdAt = datetime()
            MERGE (u)-[:LIKES {
              rating: $rating,
              intensity: $intensity,
              createdAt: datetime()
            }]->(i)
          `, { 
            userId,
            interestName: interest.name.trim(),
            category: interest.category || 'general',
            rating: interest.rating || 5,
            intensity: interest.intensity || 'medium'
          });
        }
      }

      // Agregar traits de personalidad si se proporcionan
      if (personalityTraits && Object.keys(personalityTraits).length > 0) {
        await tx.run(`
          MATCH (u:User {id: $userId})
          SET u.personalityTraits = $traits
        `, { 
          userId, 
          traits: personalityTraits 
        });
      }

      // Agregar preferencias si se proporcionan
      if (preferences && Object.keys(preferences).length > 0) {
        await tx.run(`
          MATCH (u:User {id: $userId})
          SET u.preferences = $preferences
        `, { 
          userId, 
          preferences 
        });
      }

      return tx.run(`
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:LIKES]->(i:Interest)
        RETURN u, collect({
          name: i.name,
          category: i.category
        }) as interests
      `, { userId });
    });

    const userData = result.records[0].get('u').properties;
    const userInterests = result.records[0].get('interests');

    // Remover datos sensibles
    delete userData.hashedPassword;

    res.json({
      success: true,
      message: 'Cuestionario completado exitosamente',
      user: {
        ...userData,
        interests: userInterests.filter(interest => interest.name !== null)
      },
      nextStep: 'dashboard'
    });

  } catch (error) {
    console.error('Error completando cuestionario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo completar el cuestionario'
    });
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ 
        error: 'Campos incompletos',
        details: 'Todos los campos de contraseña son requeridos'
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ 
        error: 'Las contraseñas nuevas no coinciden',
        details: 'Verifica que ambas contraseñas nuevas sean idénticas'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'Contraseña muy débil',
        details: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    // Obtener usuario actual
    const userQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      RETURN u
    `;

    const result = await runQuery(userQuery, { userId });
    
    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado'
      });
    }

    const userData = result.records[0].get('u').properties;

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, userData.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Contraseña actual incorrecta',
        details: 'La contraseña actual no es correcta'
      });
    }

    // Hash de la nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    const updateQuery = `
      MATCH (u:User {id: $userId})
      SET u.hashedPassword = $hashedPassword, u.updatedAt = datetime()
      RETURN u
    `;

    await runQuery(updateQuery, { 
      userId, 
      hashedPassword: hashedNewPassword 
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo cambiar la contraseña'
    });
  }
};

// Logout (invalidar token - esto se maneja típicamente en el frontend)
const logout = async (req, res) => {
  try {
    // En un sistema más avanzado, podrías mantener una lista negra de tokens
    // Por ahora, simplemente confirmamos el logout
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar cuenta (desactivar)
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmDeletion } = req.body;

    if (!password || confirmDeletion !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Confirmación requerida',
        details: 'Debes proporcionar tu contraseña y confirmar la eliminación'
      });
    }

    // Verificar contraseña
    const userQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      RETURN u
    `;

    const result = await runQuery(userQuery, { userId });
    
    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado'
      });
    }

    const userData = result.records[0].get('u').properties;
    const isValidPassword = await bcrypt.compare(password, userData.hashedPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Contraseña incorrecta'
      });
    }

    // Desactivar cuenta (no eliminar físicamente)
    const deactivateQuery = `
      MATCH (u:User {id: $userId})
      SET u.isActive = false, 
          u.deactivatedAt = datetime(),
          u.updatedAt = datetime()
      RETURN u
    `;

    await runQuery(deactivateQuery, { userId });

    res.json({
      success: true,
      message: 'Cuenta desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cuenta:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo eliminar la cuenta'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  completeQuestionnaire,
  changePassword,
  logout,
  deleteAccount,
  generateToken,
  verifyToken
};