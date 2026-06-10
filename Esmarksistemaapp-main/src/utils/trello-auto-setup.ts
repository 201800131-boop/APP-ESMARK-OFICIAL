/**
 * CONFIGURACIÓN AUTOMÁTICA DE TRELLO
 * Este script configura Trello automáticamente con tus credenciales
 */

interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

export class TrelloAutoSetup {
  private apiKey: string;
  private token: string;

  constructor(apiKey: string, token: string) {
    this.apiKey = apiKey;
    this.token = token;
  }

  /**
   * Obtiene todos los tableros del usuario
   */
  async getBoards(): Promise<TrelloBoard[]> {
    try {
      const response = await fetch(
        `https://api.trello.com/1/members/me/boards?key=${this.apiKey}&token=${this.token}`
      );

      if (!response.ok) {
        throw new Error('Error al obtener tableros de Trello');
      }

      const boards = await response.json();
      console.log('📋 Tableros encontrados:', boards);
      return boards;
    } catch (error) {
      console.error('❌ Error obteniendo tableros:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las listas de un tablero
   */
  async getLists(boardId: string): Promise<TrelloList[]> {
    try {
      const response = await fetch(
        `https://api.trello.com/1/boards/${boardId}/lists?key=${this.apiKey}&token=${this.token}`
      );

      if (!response.ok) {
        throw new Error('Error al obtener listas del tablero');
      }

      const lists = await response.json();
      console.log('📝 Listas encontradas:', lists);
      return lists;
    } catch (error) {
      console.error('❌ Error obteniendo listas:', error);
      throw error;
    }
  }

  /**
   * Busca listas por nombre (flexible)
   */
  findListByName(lists: TrelloList[], searchTerms: string[]): TrelloList | null {
    for (const term of searchTerms) {
      const found = lists.find(list => 
        list.name.toLowerCase().includes(term.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * Configura automáticamente las listas basándose en nombres comunes
   */
  async autoConfigureLists(boardId: string) {
    const lists = await this.getLists(boardId);

    const config = {
      trello_list_pending: this.findListByName(lists, ['pendiente', 'pending', 'to do', 'por hacer'])?.id || '',
      trello_list_design: this.findListByName(lists, ['diseño', 'design', 'disenar'])?.id || '',
      trello_list_production: this.findListByName(lists, ['producción', 'production', 'en proceso', 'doing'])?.id || '',
      trello_list_ready: this.findListByName(lists, ['listo', 'ready', 'terminado', 'done'])?.id || '',
      trello_list_delivered: this.findListByName(lists, ['entregado', 'delivered', 'completado', 'completed'])?.id || '',
    };

    console.log('🎯 Configuración automática de listas:', config);
    return { config, lists };
  }

  /**
   * Guarda la configuración completa en el backend
   */
  async saveConfiguration(boardId: string) {
    try {
      // Obtener listas y configuración automática
      const { config, lists } = await this.autoConfigureLists(boardId);

      // Preparar datos completos
      const settingsData = {
        trello_api_key: this.apiKey,
        trello_token: this.token,
        trello_board_id: boardId,
        ...config
      };

      console.log('💾 Guardando configuración en backend...');
      console.log('📊 Datos a guardar:', settingsData);

      // Guardar en localStorage
      const currentSettings = JSON.parse(localStorage.getItem('esmark_settings') || '{}');
      const updatedSettings = {
        ...currentSettings,
        ...config,
        trello_board_id: boardId,
        trello_enabled: true,
        has_trello_api_key: true,
        has_trello_token: true,
      };
      localStorage.setItem('esmark_settings', JSON.stringify(updatedSettings));
      console.log('✅ Guardado en localStorage');

      // Guardar en backend (enviar TODOS los settings, no solo los nuevos)
      const { projectId, publicAnonKey } = await import('./supabase/info');
      console.log('📤 Sincronizando settings completos al servidor...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/esmark-trello/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(updatedSettings) // ✅ Enviar settings completos
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error guardando en backend:', errorText);
        throw new Error('Error al guardar en backend');
      }

      const responseData = await response.json().catch(() => null);
      if (responseData?.settings) {
        localStorage.setItem('esmark_settings', JSON.stringify(responseData.settings));
      }

      console.log('✅ Settings completos guardados en backend');

      try {
        const webhookResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/esmark-trello/trello/webhook/ensure`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (!webhookResponse.ok) {
          const webhookError = await webhookResponse.text();
          console.warn('Trello webhook ensure failed:', webhookError);
        } else {
          console.log('ƒo. Trello webhook asegurado');
        }
      } catch (error) {
        console.warn('Trello webhook ensure error:', error);
      }

      return {
        success: true,
        settings: settingsData,
        lists: lists,
        message: '✅ Configuración de Trello guardada correctamente'
      };
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw error;
    }
  }

  /**
   * Crea una tarjeta de prueba
   */
  async createTestCard(listId: string) {
    try {
      const response = await fetch(
        `https://api.trello.com/1/cards?key=${this.apiKey}&token=${this.token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '🎉 Tarjeta de Prueba - EsmarkSystem',
            desc: 'Esta es una tarjeta de prueba creada automáticamente por EsmarkSystem.\n\n✅ Si ves esto, ¡Trello está configurado correctamente!',
            idList: listId
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear tarjeta de prueba');
      }

      const card = await response.json();
      console.log('✅ Tarjeta de prueba creada:', card);
      return card;
    } catch (error) {
      console.error('❌ Error creando tarjeta de prueba:', error);
      throw error;
    }
  }
}

/**
 * Función principal de configuración automática
 */
type AutoConfigureResult =
  | { success: true; board: TrelloBoard; settings: Record<string, any>; lists: TrelloList[]; message: string }
  | { success: false; error: string };

export async function autoConfigureTrello(apiKey: string, token: string): Promise<AutoConfigureResult> {
  console.log('🚀 Iniciando configuración automática de Trello...');
  
  const setup = new TrelloAutoSetup(apiKey, token);

  try {
    // 1. Obtener tableros
    console.log('1️⃣ Obteniendo tableros...');
    const boards = await setup.getBoards();

    if (boards.length === 0) {
      throw new Error('No se encontraron tableros en tu cuenta de Trello');
    }

    console.log(`✅ ${boards.length} tablero(s) encontrado(s)`);

    // 2. Usar el primer tablero (o el que el usuario elija)
    const selectedBoard = boards[0];
    console.log(`2️⃣ Usando tablero: "${selectedBoard.name}"`);

    // 3. Configurar listas automáticamente
    console.log('3️⃣ Configurando listas automáticamente...');
    const result = await setup.saveConfiguration(selectedBoard.id);

    // 4. Mostrar resultado
    console.log('✅ CONFIGURACIÓN COMPLETA:');
    console.log('  📋 Tablero:', selectedBoard.name);
    console.log('  🔗 URL:', selectedBoard.url);
    console.log('  📝 Listas configuradas:');
    
    result.lists.forEach((list: TrelloList) => {
      console.log(`    • ${list.name}`);
    });

    const { success: _success, ...rest } = result;
    return {
      success: true,
      board: selectedBoard,
      ...rest
    };
  } catch (error: any) {
    console.error('❌ Error en configuración automática:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
