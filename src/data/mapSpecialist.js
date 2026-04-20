export const getSpecialist = (conditionName) => {
  if (!conditionName) return 'general';
  
  const name = conditionName.toLowerCase();
  
  // Neurologist
  if (name.includes('migraine') || name.includes('headache') || name.includes('neurolog')) {
    return 'neurologist';
  }
  
  // Cardiologist
  if (name.includes('heart') || name.includes('chest pain') || name.includes('cardio') || name.includes('stroke') || name.includes('attack')) {
    return 'cardiologist';
  }

  // Dermatologist
  if (name.includes('skin') || name.includes('rash') || name.includes('acne') || name.includes('dermat')) {
    return 'dermatologist';
  }
  
  // Orthopedist
  if (name.includes('bone') || name.includes('fracture') || name.includes('arthritis') || name.includes('ortho') || name.includes('muscle')) {
    return 'orthopedist';
  }

  // Default
  return 'general';
};
