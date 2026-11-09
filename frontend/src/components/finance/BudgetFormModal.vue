<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  MinusCircleOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { Budget, WorkProgram } from '@/types/work-program';
import { extractErrorMessage, formatCurrency } from '@/utils/format';

interface ItemRow {
  uid: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const props = defineProps<{
  open: boolean;
  /** Anggaran yang diedit; null/undefined = buat baru */
  budget?: Budget | null;
  /** Kunci pilihan proker (dipakai dari halaman Detail Proker) */
  fixedWorkProgramId?: string;
  fixedWorkProgramName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved', budget: Budget): void;
}>();

const authStore = useAuthStore();
const formRef = ref();
const submitting = ref<'draft' | 'submit' | null>(null);
const workPrograms = ref<WorkProgram[]>([]);
const loadingWorkPrograms = ref(false);

let uidCounter = 0;
function newRow(partial?: Partial<Omit<ItemRow, 'uid'>>): ItemRow {
  uidCounter += 1;
  return {
    uid: `bi-${Date.now()}-${uidCounter}`,
    itemName: partial?.itemName ?? '',
    quantity: partial?.quantity ?? 1,
    unit: partial?.unit ?? '',
    unitPrice: partial?.unitPrice ?? 0,
  };
}

const formState = reactive<{
  workProgramId: string | undefined;
  notes: string;
  items: ItemRow[];
}>({
  workProgramId: undefined,
  notes: '',
  items: [newRow()],
});

const isEdit = computed(() => Boolean(props.budget));
const modalTitle = computed(() =>
  isEdit.value
    ? 'Edit Rincian Anggaran Program Kerja'
    : 'Buat Rincian Anggaran Program Kerja',
);

const totalAmount = computed(() =>
  formState.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  ),
);

// PIC hanya dapat memilih proker miliknya sendiri
const workProgramOptions = computed(() =>
  workPrograms.value
    .filter(
      (wp) =>
        authStore.userRole !== 'PIC' || wp.picId === authStore.user?.id,
    )
    .map((wp) => ({ value: wp.id, label: wp.name })),
);

async function fetchWorkPrograms() {
  if (props.fixedWorkProgramId || workPrograms.value.length > 0) return;
  loadingWorkPrograms.value = true;
  try {
    const { data } = await api.get<WorkProgram[]>('/work-programs');
    workPrograms.value = data;
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal memuat daftar proker.'));
  } finally {
    loadingWorkPrograms.value = false;
  }
}

function resetForm() {
  const b = props.budget;
  formState.workProgramId = b?.workProgramId ?? props.fixedWorkProgramId;
  formState.notes = b?.notes ?? '';
  formState.items =
    b && b.items && b.items.length > 0
      ? b.items.map((it) =>
          newRow({
            itemName: it.itemName,
            quantity: Number(it.quantity),
            unit: it.unit,
            unitPrice: Number(it.unitPrice),
          }),
        )
      : [newRow()];
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm();
      fetchWorkPrograms();
    }
  },
  { immediate: true },
);

function addRow() {
  formState.items.push(newRow());
}

function removeRow(uid: string) {
  if (formState.items.length <= 1) {
    message.warning('Minimal harus terdapat 1 item anggaran.');
    return;
  }
  formState.items = formState.items.filter((it) => it.uid !== uid);
}

const requiredRule = (label: string) => [
  { required: true, whitespace: true, message: `${label} wajib diisi` },
];

async function handleSave(submit: boolean) {
  try {
    await formRef.value?.validate();
  } catch {
    message.warning('Lengkapi seluruh isian rincian anggaran terlebih dahulu.');
    return;
  }

  if (submit && totalAmount.value <= 0) {
    message.warning('Total anggaran harus lebih dari Rp 0 untuk diajukan.');
    return;
  }

  const items = formState.items.map((it) => ({
    itemName: it.itemName.trim(),
    quantity: Number(it.quantity),
    unit: it.unit.trim(),
    unitPrice: Number(it.unitPrice),
  }));

  submitting.value = submit ? 'submit' : 'draft';
  try {
    let data: Budget;
    if (isEdit.value && props.budget) {
      ({ data } = await api.patch<Budget>(`/budgets/${props.budget.id}`, {
        notes: formState.notes,
        items,
        submit,
      }));
    } else {
      ({ data } = await api.post<Budget>('/budgets', {
        workProgramId: formState.workProgramId,
        notes: formState.notes || undefined,
        items,
        submit,
      }));
    }
    message.success(
      submit
        ? 'Anggaran berhasil diajukan dan menunggu approval.'
        : 'Rincian anggaran berhasil disimpan sebagai Draft.',
    );
    emit('saved', data);
    emit('update:open', false);
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal menyimpan rincian anggaran.'));
  } finally {
    submitting.value = null;
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="1000px"
    :mask-closable="false"
    destroy-on-close
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <a-alert
      v-if="budget?.status === 'REJECTED'"
      type="warning"
      show-icon
      style="margin: 12px 0"
      message="Anggaran ini sebelumnya ditolak. Setelah direvisi, status akan kembali menjadi Draft atau langsung diajukan ulang."
    />

    <a-form
      ref="formRef"
      layout="vertical"
      :model="formState"
      style="margin-top: 12px"
    >
      <a-form-item
        label="Program Kerja"
        name="workProgramId"
        :rules="[{ required: true, message: 'Program kerja wajib dipilih' }]"
      >
        <a-input
          v-if="fixedWorkProgramId || isEdit"
          :value="
            fixedWorkProgramName ||
            budget?.workProgram?.name ||
            'Program kerja terpilih'
          "
          disabled
        />
        <a-select
          v-else
          v-model:value="formState.workProgramId"
          show-search
          option-filter-prop="label"
          placeholder="Pilih program kerja..."
          :loading="loadingWorkPrograms"
          :options="workProgramOptions"
        />
      </a-form-item>

      <a-form-item label="Keterangan / Judul Pengajuan (Opsional)" name="notes">
        <a-textarea
          v-model:value="formState.notes"
          :rows="2"
          placeholder="cth. Anggaran konsumsi & perlengkapan acara"
        />
      </a-form-item>

      <div class="items-header">
        <span class="fw-semibold">
          Rincian Item Anggaran ({{ formState.items.length }})
        </span>
        <a-button type="dashed" :icon="h(PlusOutlined)" @click="addRow">
          Tambah Item
        </a-button>
      </div>

      <div v-for="(item, idx) in formState.items" :key="item.uid" class="item-row">
        <a-row :gutter="10" align="bottom">
          <a-col :xs="24" :md="7">
            <a-form-item
              :label="idx === 0 ? 'Nama Item' : undefined"
              :name="['items', idx, 'itemName']"
              :rules="requiredRule('Nama item')"
            >
              <a-input v-model:value="item.itemName" placeholder="cth. Konsumsi" />
            </a-form-item>
          </a-col>
          <a-col :xs="8" :md="3">
            <a-form-item
              :label="idx === 0 ? 'Qty' : undefined"
              :name="['items', idx, 'quantity']"
              :rules="[{ required: true, message: 'Wajib' }]"
            >
              <a-input-number
                v-model:value="item.quantity"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="8" :md="3">
            <a-form-item
              :label="idx === 0 ? 'Satuan' : undefined"
              :name="['items', idx, 'unit']"
              :rules="requiredRule('Satuan')"
            >
              <a-input v-model:value="item.unit" placeholder="pcs" :maxlength="50" />
            </a-form-item>
          </a-col>
          <a-col :xs="8" :md="5">
            <a-form-item
              :label="idx === 0 ? 'Harga Satuan (Rp)' : undefined"
              :name="['items', idx, 'unitPrice']"
              :rules="[{ required: true, message: 'Wajib' }]"
            >
              <a-input-number
                v-model:value="item.unitPrice"
                :min="0"
                :precision="0"
                :step="1000"
                style="width: 100%"
                :formatter="(v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')"
                :parser="(v: any) => `${v}`.replace(/\./g, '')"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="18" :md="4">
            <a-form-item :label="idx === 0 ? 'Total Harga' : undefined">
              <div class="row-total">
                {{ formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0)) }}
              </div>
            </a-form-item>
          </a-col>
          <a-col :xs="6" :md="2">
            <a-form-item :label="idx === 0 ? ' ' : undefined">
              <a-button
                type="text"
                danger
                :disabled="formState.items.length <= 1"
                :icon="h(MinusCircleOutlined)"
                @click="removeRow(item.uid)"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div class="grand-total">
        <span>Total Anggaran (otomatis)</span>
        <strong>{{ formatCurrency(totalAmount) }}</strong>
      </div>
    </a-form>

    <template #footer>
      <a-space>
        <a-button :disabled="submitting !== null" @click="emit('update:open', false)">
          Batal
        </a-button>
        <a-button
          :icon="h(SaveOutlined)"
          :loading="submitting === 'draft'"
          :disabled="submitting === 'submit'"
          @click="handleSave(false)"
        >
          Simpan sebagai Draft
        </a-button>
        <a-button
          type="primary"
          :icon="h(SendOutlined)"
          :loading="submitting === 'submit'"
          :disabled="submitting === 'draft'"
          @click="handleSave(true)"
        >
          Ajukan Approval (PENDING)
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<style scoped>
.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.item-row {
  border-bottom: 1px dashed #dbe2ef;
  margin-bottom: 4px;
}

.item-row :deep(.ant-form-item) {
  margin-bottom: 10px;
}

.row-total {
  font-weight: 600;
  color: #112d4e;
  line-height: 32px;
}

.grand-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #112d4e, #3f72af);
  color: #ffffff;
  font-size: 15px;
}

.grand-total strong {
  font-size: 20px;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}
</style>
