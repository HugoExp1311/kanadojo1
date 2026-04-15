import ContentLayout from '@/shared/components/layout/ContentLayout';
import PostWrapper from '@/shared/components/layout/PostWrapper';
import termsOfService from '@/shared/lib/legal/termsOfService';

const TermsOfService = () => {
  return (
    <ContentLayout>
      <PostWrapper textContent={termsOfService} />
    </ContentLayout>
  );
};

export default TermsOfService;
