import PostWrapper from '@/shared/components/layout/PostWrapper';
import privacyPolicy from '@/shared/lib/legal/privacyPolicy';
import ContentLayout from '@/shared/components/layout/ContentLayout';

const PrivacyPolicy = () => {
  return (
    <ContentLayout>
      <PostWrapper textContent={privacyPolicy} />
    </ContentLayout>
  );
};

export default PrivacyPolicy;
