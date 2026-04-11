const { showToast, showPromptModal, showConfirmModal } = window;
import { sanitizeHtml } from '../../js/modules/ui.js';
import {
  getGroups,
  getExtraItems,
  addGroup,
  addExtraItem,
  calculateAdvancedMode,
  resetExtraItems,
} from './invoice-editor.js';

/**
 * Invoice Templates Manager
 * 인보이스 템플릿 저장/불러오기 기능
 */

const TEMPLATE_STORAGE_KEY = 'invoice_templates';

// 템플릿 구조
// {
//     id: string,
//     name: string,
//     type: 'deposit' | 'additional_items' | 'full',
//     data: object,
//     created_at: string
// }

class TemplateManager {
  constructor() {
    // localStorage에서 즉시 로드 (빈 화면 방지) + 서버에서 비동기 갱신
    try {
      const local = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      this.templates = local ? JSON.parse(local) : [];
    } catch (e) {
      this.templates = [];
    }
    this.ready = this._loadFromServer();
  }

  async _loadFromServer() {
    try {
      const res = await fetch('/api/invoice-templates', { credentials: 'include' });
      const rows = await res.json();
      this.templates = rows.map(r => ({
        id: r.id.toString(),
        name: r.name,
        data: r.data,
        created_at: r.created_at
      }));
      // 서버 로드 성공 후 UI 갱신
      try {
        updateDepositTemplateList();
        updateAdditionalItemsTemplateList();
        updateFullTemplateList();
      } catch (e3) {}
    } catch (e) {
      // 폴백: localStorage (이미 constructor에서 로드됨)
      console.warn('템플릿 서버 로드 실패, localStorage 사용:', e);
    }
  }

  // 템플릿 저장 (서버 DB)
  async saveTemplate(template) {
    try {
      await fetch('/api/invoice-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: template.name, data: template.data })
      });
    } catch (error) {
      console.error('템플릿 서버 저장 오류:', error);
    }
  }

  // 새 템플릿 추가
  async addTemplate(name, type, data) {
    const template = {
      id: 'template-' + Date.now(),
      name,
      type,
      data,
      created_at: new Date().toISOString(),
    };

    this.templates.push(template);
    await this.saveTemplate(template);
    return template;
  }

  // 템플릿 가져오기
  getTemplate(id) {
    return this.templates.find((t) => t.id === id || t.id.toString() === id.toString());
  }

  // 타입별 템플릿 목록
  getTemplatesByType(type) {
    return this.templates.filter((t) => t.type === type);
  }

  // 템플릿 삭제 (서버 DB)
  async deleteTemplate(id) {
    this.templates = this.templates.filter((t) => t.id !== id && t.id.toString() !== id.toString());
    try {
      await fetch(`/api/invoice-templates/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch (e) { console.error('템플릿 삭제 오류:', e); }
  }

  // 모든 템플릿 가져오기
  getAllTemplates() {
    return this.templates;
  }

  // 서버에서 최신 데이터 다시 로드
  async refresh() {
    await this._loadFromServer();
  }
}

// 전역 인스턴스
const templateManager = new TemplateManager();

// 계약금 설명 템플릿 저장
async function saveDepositDescriptionTemplate() {
  const description = document.getElementById('deposit-description').value;

  if (!description || description.trim() === '') {
    showToast('계약금 설명을 입력해주세요.', 'warning');
    return;
  }

  const name = await showPromptModal(
    '템플릿 이름을 입력하세요',
    '계약금 설명 템플릿'
  );
  if (!name) return;

  try {
    await templateManager.addTemplate(name, 'deposit', {
      deposit_description: description,
    });
    showToast('템플릿이 저장되었습니다.', 'success');
    updateDepositTemplateList();
  } catch (error) {
    showToast('템플릿 저장 실패: ' + error.message, 'error');
  }
}

// 추가 비용 항목 템플릿 저장
async function saveAdditionalItemsTemplate() {
  const items = getExtraItems();

  if (!items || items.length === 0) {
    showToast('추가 비용 항목을 입력해주세요.', 'warning');
    return;
  }

  const name = await showPromptModal(
    '템플릿 이름을 입력하세요',
    '추가 비용 템플릿'
  );
  if (!name) return;

  try {
    await templateManager.addTemplate(name, 'additional_items', {
      additional_items: items,
    });
    showToast('템플릿이 저장되었습니다.', 'success');
    updateAdditionalItemsTemplateList();
  } catch (error) {
    showToast('템플릿 저장 실패: ' + error.message, 'error');
  }
}

// Advanced Mode 전체 템플릿 저장
async function saveAdvancedModeTemplate() {
  const name = await showPromptModal(
    '템플릿 이름을 입력하세요',
    'Advanced Mode 템플릿'
  );
  if (!name) return;

  try {
    const data = {
      groups: getGroups(),
      extras: getExtraItems(),
      deposit_description:
        document.getElementById('deposit-description').value || '',
    };

    await templateManager.addTemplate(name, 'full', data);
    showToast('템플릿이 저장되었습니다.', 'success');
    updateFullTemplateList();
  } catch (error) {
    showToast('템플릿 저장 실패: ' + error.message, 'error');
  }
}

// 템플릿 불러오기
function loadTemplate(templateId) {
  const template = templateManager.getTemplate(templateId);
  if (!template) {
    showToast('템플릿을 찾을 수 없습니다.', 'error');
    return;
  }

  try {
    if (template.type === 'deposit') {
      document.getElementById('deposit-description').value =
        template.data.deposit_description || '';
    } else if (template.type === 'additional_items') {
      // 기존 항목 초기화
      resetExtraItems();

      // 템플릿 항목 추가
      template.data.additional_items.forEach((item) => {
        addExtraItem(item);
      });
    } else if (template.type === 'full') {
      // 그룹 + 추가항목 + 비고 복원
      document.getElementById('groups-container').innerHTML = '';
      resetExtraItems();

      if (template.data.groups) {
        template.data.groups.forEach((g) => addGroup(g));
      }

      if (template.data.extras) {
        template.data.extras.forEach((ex) => addExtraItem(ex));
      }

      document.getElementById('deposit-description').value =
        template.data.deposit_description || '';

      // 구 형식 호환 (base_price 기반)
      if (!template.data.groups && template.data.base_price_per_person) {
        addGroup({
          name: '전체',
          count: template.data.total_participants || 0,
          unitPrice: template.data.base_price_per_person || 0,
          deposit: template.data.deposit_amount
            ? Math.round(template.data.deposit_amount / (template.data.total_participants || 1))
            : 0,
        });
        if (template.data.additional_items) {
          template.data.additional_items.forEach((item) => addExtraItem(item));
        }
      }

      setTimeout(() => calculateAdvancedMode(), 100);
    }

    showToast('템플릿이 적용되었습니다.', 'success');
  } catch (error) {
    console.error('템플릿 로드 오류:', error);
    showToast('템플릿 적용 실패: ' + error.message, 'error');
  }
}

// 템플릿 삭제
async function deleteTemplate(templateId) {
  if (
    !(await showConfirmModal('템플릿 삭제', '정말 삭제하시겠습니까?', {
      danger: true,
    }))
  )
    return;

  try {
    await templateManager.deleteTemplate(templateId);
    showToast('템플릿이 삭제되었습니다.', 'success');
    updateAllTemplateLists();
  } catch (error) {
    showToast('템플릿 삭제 실패: ' + error.message, 'error');
  }
}

// 템플릿 목록 업데이트
function updateDepositTemplateList() {
  const container = document.getElementById('deposit-template-list');
  if (!container) return;

  const templates = templateManager.getTemplatesByType('deposit');
  container.innerHTML = '';

  if (templates.length === 0) {
    container.innerHTML =
      '<p class="template-empty">저장된 템플릿이 없습니다.</p>';
    return;
  }

  templates.forEach((template) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
            <span class="template-name">${sanitizeHtml(template.name)}</span>
            <div class="template-actions">
                <button onclick="loadTemplate('${template.id}')" class="btn-template-load">적용</button>
                <button onclick="deleteTemplate('${template.id}')" class="btn-template-delete">삭제</button>
            </div>
        `;
    container.appendChild(item);
  });
}

function updateAdditionalItemsTemplateList() {
  const container = document.getElementById('additional-items-template-list');
  if (!container) return;

  const templates = templateManager.getTemplatesByType('additional_items');
  container.innerHTML = '';

  if (templates.length === 0) {
    container.innerHTML =
      '<p class="template-empty">저장된 템플릿이 없습니다.</p>';
    return;
  }

  templates.forEach((template) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
            <span class="template-name">${sanitizeHtml(template.name)}</span>
            <div class="template-actions">
                <button onclick="loadTemplate('${template.id}')" class="btn-template-load">적용</button>
                <button onclick="deleteTemplate('${template.id}')" class="btn-template-delete">삭제</button>
            </div>
        `;
    container.appendChild(item);
  });
}

function updateFullTemplateList() {
  const container = document.getElementById('full-template-list');
  if (!container) return;

  const templates = templateManager.getTemplatesByType('full');
  container.innerHTML = '';

  if (templates.length === 0) {
    container.innerHTML =
      '<p class="template-empty">저장된 템플릿이 없습니다.</p>';
    return;
  }

  templates.forEach((template) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
            <span class="template-name">${sanitizeHtml(template.name)}</span>
            <div class="template-actions">
                <button onclick="loadTemplate('${template.id}')" class="btn-template-load">적용</button>
                <button onclick="deleteTemplate('${template.id}')" class="btn-template-delete">삭제</button>
            </div>
        `;
    container.appendChild(item);
  });
}

function updateAllTemplateLists() {
  updateDepositTemplateList();
  updateAdditionalItemsTemplateList();
  updateFullTemplateList();
}

// 템플릿 모달 열기/닫기
function openTemplateModal() {
  const modal = document.getElementById('template-modal');
  if (modal) {
    modal.style.display = 'block';
    updateAllTemplateLists();
  }
}

function closeTemplateModal() {
  const modal = document.getElementById('template-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// onclick 핸들러용 window 노출 (innerHTML에서 사용)
window.loadTemplate = loadTemplate;
window.deleteTemplate = deleteTemplate;
window.saveDepositDescriptionTemplate = saveDepositDescriptionTemplate;
window.saveAdditionalItemsTemplate = saveAdditionalItemsTemplate;
window.saveAdvancedModeTemplate = saveAdvancedModeTemplate;
window.openTemplateModal = openTemplateModal;
window.closeTemplateModal = closeTemplateModal;

export {
  templateManager,
  loadTemplate,
  deleteTemplate,
  openTemplateModal,
  closeTemplateModal,
};
