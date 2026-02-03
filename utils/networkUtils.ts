import i18nService from '../services/i18nService';

export interface Superieur {
  id: string;
  username: string;
  type: 'network_responsible' | 'group_responsible';
  qualification?: string;
  label: string;
}

export const calculateAvailableSuperieurs = (
  qualification: string | null | undefined,
  networkData: any
): Superieur[] => {
  if (!qualification || !networkData) return [];

  const superieurs: Superieur[] = [];
  
  const qualValue = parseInt(qualification.replace('QUALIFICATION_', ''));
  
  if (qualValue === 12) {
    if (networkData.reseau?.responsable1) {
      superieurs.push({
        id: networkData.reseau.responsable1.id || networkData.reseau.responsable1._id,
        username: networkData.reseau.responsable1.username,
        type: 'network_responsible',
        label: `${networkData.reseau.responsable1.username} - ${i18nService.t('networks.details.networkResponsible') || 'Responsable réseau'}`
      });
    }
    if (networkData.reseau?.responsable2) {
      superieurs.push({
        id: networkData.reseau.responsable2.id || networkData.reseau.responsable2._id,
        username: networkData.reseau.responsable2.username,
        type: 'network_responsible',
        label: `${networkData.reseau.responsable2.username} - ${i18nService.t('networks.details.networkResponsible') || 'Responsable réseau'}`
      });
    }
  } else {
    const requiredQualification = qualValue / 12;
    const requiredQualString = `QUALIFICATION_${requiredQualification}`;
    
    const matchingGroups = networkData.grs?.filter((groupe: any) => {
      const responsable1Qual = groupe.responsable1?.qualification;
      const responsable2Qual = groupe.responsable2?.qualification;
      return responsable1Qual === requiredQualString || responsable2Qual === requiredQualString;
    }) || [];
    
    matchingGroups.forEach((groupe: any) => {
      if (groupe.responsable1 && groupe.responsable1.qualification === requiredQualString) {
        superieurs.push({
          id: groupe.responsable1.id || groupe.responsable1._id,
          username: groupe.responsable1.username,
          type: 'group_responsible',
          qualification: groupe.responsable1.qualification,
          label: `${groupe.responsable1.username} - ${groupe.responsable1.qualification?.replace('QUALIFICATION_', '') || i18nService.t('networks.details.group') || 'Groupe'}`
        });
      }
      if (groupe.responsable2 && groupe.responsable2.qualification === requiredQualString) {
        superieurs.push({
          id: groupe.responsable2.id || groupe.responsable2._id,
          username: groupe.responsable2.username,
          type: 'group_responsible',
          qualification: groupe.responsable2.qualification,
          label: `${groupe.responsable2.username} - ${groupe.responsable2.qualification?.replace('QUALIFICATION_', '') || i18nService.t('networks.details.group') || 'Groupe'}`
        });
      }
    });
  }
  
  return superieurs;
};

export const generateGroupName = (
  responsable1: string | null | undefined,
  responsable2: string | null | undefined,
  availableResponsablesList: any[],
  networkData: any,
  formatResponsableNameFn: (username: string) => string
): string => {
  if (!responsable1) return '';
  
  let user1 = availableResponsablesList.find(u => (u.id || u._id) === responsable1);
  let user2 = availableResponsablesList.find(u => (u.id || u._id) === responsable2);
  
  if (!user1 && networkData.reseau?.responsable1) {
    const responsable1Id = networkData.reseau.responsable1.id || networkData.reseau.responsable1._id;
    if (responsable1Id === responsable1) {
      user1 = networkData.reseau.responsable1;
    }
  }
  if (!user2 && networkData.reseau?.responsable1) {
    const responsable1Id = networkData.reseau.responsable1.id || networkData.reseau.responsable1._id;
    if (responsable1Id === responsable2) {
      user2 = networkData.reseau.responsable1;
    }
  }
  
  let responsableName = '';
  if (user1) {
    if (user1.username) {
      responsableName = formatResponsableNameFn(user1.username);
    } else {
      responsableName = user1.pseudo || '';
    }
  } else if (user2) {
    if (user2.username) {
      responsableName = formatResponsableNameFn(user2.username);
    } else {
      responsableName = user2.pseudo || '';
    }
  }
  
  if (!responsableName) return '';
  
  const cleanName = responsableName
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  
  return `GR_${cleanName}`;
};

