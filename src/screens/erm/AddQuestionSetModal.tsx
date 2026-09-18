/**
 * "Add new" question set (refinement round): dropzone with the shared
 * upload states, title, description, Save/Cancel. The mock parses no
 * file — a saved set gets a placeholder question list, labeled honestly.
 */
import { useRef, useState } from 'react'
import { useErmMutations } from '@/api/hooks'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { UploadFileRows } from '@/components/upload/UploadFileRows'
import { useUploadList } from '@/components/upload/uploadList'
import { strings } from '@/strings'

const s = strings.erm.start
const isTabular = (name: string) => /\.(csv|xlsx)$/i.test(name)

export function AddQuestionSetModal({ onClose }: { onClose: () => void }) {
  const m = useErmMutations()
  const upload = useUploadList(isTabular)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function saveSet() {
    await m.addQuestionSet.mutateAsync({
      name: title.trim(),
      description: desc.trim(),
      fileName: upload.files[0]?.name,
    })
    onClose()
  }

  return (
    <Modal title={s.qsModalTitle} closeLabel={s.qsModalClose} onClose={onClose}>
      <div
        role="button"
        tabIndex={0}
        aria-label={s.qsDropAria}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInput.current?.click()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          upload.addFiles(e.dataTransfer.files)
        }}
        className="cursor-pointer rounded-xl border-[1.5px] border-dashed border-rule-strong bg-bg-subtle px-[18px] py-5 text-center hover:border-faint hover:bg-bg-hover"
      >
        <div className="text-[0.84375rem] font-semibold">{s.qsDropTitle}</div>
        <div className="mt-0.5 text-[0.78125rem] text-muted">{s.qsDropHint}</div>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".csv,.xlsx"
          onChange={(e) => {
            if (e.target.files) upload.addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      <UploadFileRows
        files={upload.files}
        rejected={upload.rejected}
        progressOf={upload.progressOf}
        onRemove={upload.removeFile}
        onRemoveRejected={upload.removeRejected}
        listAria={s.qsDropAria}
      />
      <div className="mt-3.5">
        <label htmlFor="qs-title" className="micro mb-[5px] block">
          {s.qsTitleLabel}
        </label>
        <input
          id="qs-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={s.qsTitlePlaceholder}
          className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
        />
      </div>
      <div className="mt-3">
        <label htmlFor="qs-desc" className="micro mb-[5px] block">
          {s.qsDescLabel}
        </label>
        <input
          id="qs-desc"
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={s.qsDescPlaceholder}
          className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
        />
      </div>
      <div className="mt-[18px] flex justify-end gap-2">
        <Button variant="outline" small onClick={onClose}>
          {s.qsCancel}
        </Button>
        <Button
          variant="primary"
          small
          disabled={!title.trim() || m.addQuestionSet.isPending}
          onClick={saveSet}
        >
          {s.qsSave}
        </Button>
      </div>
    </Modal>
  )
}
